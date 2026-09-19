import { test, expect, AuthenticatedUserSession } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient, DbClient } from '../../database/db-client';
import { AuthApi, BeneficiariesApi, TransfersApi, WalletApi, TransactionsApi } from '../../api';
import { config } from '../../config/env.config';
import { CreateBeneficiaryRequest, CreateTransferRequest, TransferResponse } from '../../api/types';

// =========================================================================
// Helpers for Concurrency Tests
// =========================================================================

const getNormalizedApiBaseUrl = (): string => {
  return config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
};

function generateIdempotencyKey(prefix = 'conc-tx'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateBeneficiaryPayload(
  overrides?: Partial<CreateBeneficiaryRequest>,
): CreateBeneficiaryRequest {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  return {
    name: overrides?.name || `Beneficiary_${unique}`,
    currency: overrides?.currency || 'EUR',
    payoutMethod: overrides?.payoutMethod || 'bank_account',
    accountNumber: overrides?.accountNumber || `IT12A${unique}`,
    bankCode: overrides?.bankCode || 'UNCRITM1',
    bankName: overrides?.bankName || 'UniCredit Test Bank',
    ...overrides,
  };
}

async function setupFundedUser(
  authUser: AuthenticatedUserSession,
  db: DbClient,
  balance: number = 500,
  beneficiaryOverrides?: Partial<CreateBeneficiaryRequest>,
) {
  const walletRes = await authUser.api.wallet.getMyWallet();
  expect(walletRes.status()).toBe(200);
  const wallet = await walletRes.json();

  // Reset wallet balance atomically in DB for test isolation
  await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [balance, wallet.id]);

  const benRes = await authUser.api.beneficiaries.createBeneficiary(
    generateBeneficiaryPayload(beneficiaryOverrides),
  );
  expect(benRes.status()).toBe(201);
  const beneficiary = await benRes.json();

  return { wallet, beneficiary };
}

// =========================================================================
// STEP 5K: Concurrent Transfers & Pessimistic Locking Test Suite
// =========================================================================

test.describe('Step 5K - Concurrent Transfers & Database Row Locking', () => {
  // =======================================================================
  // 1. Two Concurrent Transfers from Same Wallet (Sufficient Balance)
  // =======================================================================
  test('executes two concurrent transfers from same wallet with sufficient balance without race condition', async ({
    authUser,
    db,
  }) => {
    // Initial balance: 500.00 EUR
    // Transfer A: 100.00 EUR + 25.00 EUR fee = 125.00 EUR
    // Transfer B: 100.00 EUR + 25.00 EUR fee = 125.00 EUR
    // Total deduction: 250.00 EUR -> Expected final balance: 250.00 EUR
    const initialBalance = 500.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    // Create a second beneficiary so transfers target distinct recipients
    const ben2Res = await authUser.api.beneficiaries.createBeneficiary(
      generateBeneficiaryPayload({ name: 'Beneficiary Two Concurrent' }),
    );
    expect(ben2Res.status()).toBe(201);
    const beneficiary2 = await ben2Res.json();

    const payloadA: CreateTransferRequest = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary.id,
      sendAmount: 100.0,
      destinationCurrency: 'EUR',
    };
    const payloadB: CreateTransferRequest = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary2.id,
      sendAmount: 100.0,
      destinationCurrency: 'EUR',
    };

    // Launch both requests simultaneously via Promise.all
    const [resA, resB] = await Promise.all([
      authUser.api.transfers.createTransfer(payloadA, generateIdempotencyKey('txA')),
      authUser.api.transfers.createTransfer(payloadB, generateIdempotencyKey('txB')),
    ]);

    // 1. Both API responses succeeded with 201 Created
    expect(resA.status()).toBe(201);
    expect(resB.status()).toBe(201);

    const dataA: TransferResponse = await resA.json();
    const dataB: TransferResponse = await resB.json();

    // 2. Distinct transactions and references generated
    expect(dataA.id).not.toBe(dataB.id);
    expect(dataA.reference).not.toBe(dataB.reference);

    // 3. PostgreSQL wallet balance exactly debited
    const postWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(postWallet?.balance)).toBe(250.0);

    // 4. Exactly 2 transaction records committed in PostgreSQL
    const txRows = await db.query<{ id: string; status: string }>(
      'SELECT id, status FROM transactions WHERE id IN ($1, $2)',
      [dataA.id, dataB.id],
    );
    expect(txRows.rows.length).toBe(2);

    // 5. Invariant: Balance never negative
    expect(Number(postWallet?.balance)).toBeGreaterThanOrEqual(0);
  });

  // =======================================================================
  // 2. Two Concurrent Transfers Competing for Scarce Balance (Double-Spend Barrier)
  // =======================================================================
  test('prevents double-spending when two concurrent transfers compete for scarce balance (125 EUR)', async ({
    authUser,
    db,
  }) => {
    // Initial balance: 125.00 EUR
    // Transfer A: 100.00 EUR + 25.00 EUR fee = 125.00 EUR (consumes full balance)
    // Transfer B: 100.00 EUR + 25.00 EUR fee = 125.00 EUR (requires additional 125.00 EUR)
    // Financial Invariant: Exactly ONE transfer must succeed; the other MUST be rejected.
    // The wallet balance must become 0.00 EUR and NEVER negative.
    const initialBalance = 125.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const ben2Res = await authUser.api.beneficiaries.createBeneficiary(
      generateBeneficiaryPayload({ name: 'Beneficiary Contender Two' }),
    );
    expect(ben2Res.status()).toBe(201);
    const beneficiary2 = await ben2Res.json();

    const payloadA: CreateTransferRequest = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary.id,
      sendAmount: 100.0,
      destinationCurrency: 'EUR',
    };
    const payloadB: CreateTransferRequest = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary2.id,
      sendAmount: 100.0,
      destinationCurrency: 'EUR',
    };

    // Fire both requests concurrently
    const [resA, resB] = await Promise.all([
      authUser.api.transfers.createTransfer(payloadA, generateIdempotencyKey('scarceA')),
      authUser.api.transfers.createTransfer(payloadB, generateIdempotencyKey('scarceB')),
    ]);

    const statuses = [resA.status(), resB.status()];
    // Exactly one 201 Created and one 400 Bad Request
    expect(statuses).toContain(201);
    expect(statuses).toContain(400);

    const successRes = resA.status() === 201 ? resA : resB;
    const failureRes = resA.status() === 400 ? resA : resB;

    const successData: TransferResponse = await successRes.json();
    const failureData = await failureRes.json();

    // Verify rejection reason on the losing request
    expect(failureData.message).toContain('Insufficient wallet balance');

    // Financial Invariant Verification:
    // 1. Final wallet balance must be EXACTLY 0.00 EUR
    const postWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(postWallet?.balance)).toBe(0.0);

    // 2. Exactly one transaction committed in PostgreSQL
    const txRows = await db.query<{ id: string }>(
      'SELECT id FROM transactions WHERE "userId" = $1',
      [authUser.user.id],
    );
    expect(txRows.rows.length).toBe(1);
    expect(txRows.rows[0].id).toBe(successData.id);

    // 3. No negative balance allowed under any circumstances
    expect(Number(postWallet?.balance)).toBeGreaterThanOrEqual(0);
  });

  // =======================================================================
  // 3. Higher Concurrency Overdraft Prevention (8 Requests Against 300 EUR)
  // =======================================================================
  test('strictly enforces balance conservation under high concurrency (8 requests against 300 EUR)', async ({
    authUser,
    db,
  }) => {
    // Initial balance: 300.00 EUR
    // 8 concurrent requests: each 50.00 EUR + 25.00 EUR fee = 75.00 EUR
    // Total exposure attempted: 8 * 75 = 600.00 EUR
    // Expected outcome: Exactly 4 transfers succeed (4 * 75 = 300 EUR), exactly 4 fail (400 Bad Request)
    // Final balance: 0.00 EUR
    const initialBalance = 300.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const concurrencyCount = 8;
    const sendAmount = 50.0;
    const fee = 25.0;
    const totalPerTx = sendAmount + fee; // 75.00 EUR

    const transferPromises = Array.from({ length: concurrencyCount }, (_, i) => {
      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount,
        destinationCurrency: 'EUR',
      };
      return authUser.api.transfers.createTransfer(
        payload,
        generateIdempotencyKey(`high-conc-${i}`),
      );
    });

    // Launch all 8 requests simultaneously
    const responses = await Promise.all(transferPromises);

    const successResponses = responses.filter((r) => r.status() === 201);
    const failureResponses = responses.filter((r) => r.status() === 400);

    // Assert exact win/loss split based on math
    const maxAffordable = Math.floor(initialBalance / totalPerTx); // 300 / 75 = 4
    expect(successResponses.length).toBe(maxAffordable);
    expect(failureResponses.length).toBe(concurrencyCount - maxAffordable);

    // Check failure messages
    for (const failRes of failureResponses) {
      const err = await failRes.json();
      expect(err.message).toContain('Insufficient wallet balance');
    }

    // Financial Invariant: Wallet balance must equal initial - (4 * 75) = 0.00 EUR
    const postWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(postWallet?.balance)).toBe(0.0);

    // Database Invariant: Exactly 4 transaction rows in PostgreSQL
    const txRows = await db.query<{ id: string; senderAmount: string }>(
      'SELECT id, "senderAmount" FROM transactions WHERE "userId" = $1',
      [authUser.user.id],
    );
    expect(txRows.rows.length).toBe(maxAffordable);

    // Total debits conservation
    const totalCommittedDebits = txRows.rows.length * totalPerTx;
    expect(initialBalance - totalCommittedDebits).toBe(Number(postWallet?.balance));
  });

  // =======================================================================
  // 4. Concurrent Independent Transfers (Different Beneficiaries, Sufficient Funds)
  // =======================================================================
  test('correctly serializes 3 independent concurrent transfers without deadlocks or lost updates', async ({
    authUser,
    db,
  }) => {
    // Balance: 400.00 EUR
    // 3 transfers:
    // Tx 1: 30 EUR + 25 fee = 55 EUR
    // Tx 2: 40 EUR + 25 fee = 65 EUR
    // Tx 3: 50 EUR + 25 fee = 75 EUR
    // Total deduction: 55 + 65 + 75 = 195.00 EUR
    // Expected final: 400 - 195 = 205.00 EUR
    const initialBalance = 400.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const amounts = [30.0, 40.0, 50.0];
    const fees = [25.0, 25.0, 25.0];
    const totalExpectedDeduction = amounts.reduce((a, b) => a + b, 0) + fees.reduce((a, b) => a + b, 0);

    const transferRequests = amounts.map((amt, idx) => {
      return authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: amt,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey(`indep-${idx}`),
      );
    });

    const responses = await Promise.all(transferRequests);

    // All 3 should succeed
    for (const res of responses) {
      expect(res.status()).toBe(201);
    }

    const txDataList: TransferResponse[] = await Promise.all(responses.map((r) => r.json()));
    const uniqueIds = new Set(txDataList.map((d) => d.id));
    const uniqueRefs = new Set(txDataList.map((d) => d.reference));
    expect(uniqueIds.size).toBe(3);
    expect(uniqueRefs.size).toBe(3);

    // Database verification: No lost updates
    const postWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(postWallet?.balance)).toBe(initialBalance - totalExpectedDeduction);
  });

  // =======================================================================
  // 5. Concurrent Reads During Active Write Bursts
  // =======================================================================
  test('maintains read consistency without dirty states when querying wallet/transactions during concurrent writes', async ({
    authUser,
    db,
  }) => {
    const initialBalance = 500.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const writePromises = [
      authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('read-write-1'),
      ),
      authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('read-write-2'),
      ),
    ];

    const readPromises = [
      authUser.api.wallet.getMyWallet(),
      authUser.api.transactions.getMyTransactions({ limit: 10 }),
      authUser.api.wallet.getMyWallet(),
    ];

    // Fire both reads and writes concurrently
    const [writeRes1, writeRes2, readWallet1, readTxList, readWallet2] = await Promise.all([
      ...writePromises,
      ...readPromises,
    ]);

    expect(writeRes1.status()).toBe(201);
    expect(writeRes2.status()).toBe(201);

    // Reads must never return 500 or malformed data
    expect(readWallet1.status()).toBe(200);
    expect(readWallet2.status()).toBe(200);
    expect(readTxList.status()).toBe(200);

    const w1 = await readWallet1.json();
    const w2 = await readWallet2.json();

    // Invariant: Balance in intermediate reads is never negative and never exceeds initial
    expect(w1.balance).toBeGreaterThanOrEqual(0);
    expect(w1.balance).toBeLessThanOrEqual(initialBalance);
    expect(w2.balance).toBeGreaterThanOrEqual(0);
    expect(w2.balance).toBeLessThanOrEqual(initialBalance);

    // Final settled balance must be 500 - (75 * 2) = 350.00 EUR
    const finalWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(finalWallet?.balance)).toBe(350.0);
  });

  // =======================================================================
  // 6. Concurrent Cross-User Operations
  // =======================================================================
  test('guarantees complete isolation between concurrent transfers executed by separate users', async ({
    playwright,
    apiContext,
    authUser: userA,
    db,
  }) => {
    // 1. Provision User B
    const userBData = generateTestUserData();
    const authApi = new AuthApi(apiContext);
    const signupRes = await authApi.signup(userBData);
    expect(signupRes.status()).toBe(201);
    const signupData = await signupRes.json();
    const userBId = signupData.userId;
    await authApi.verifyEmail({ email: userBData.email, code: '123456' });
    const loginRes = await authApi.login({ email: userBData.email, password: userBData.password });
    const { access_token } = await loginRes.json();

    const userBContext = await playwright.request.newContext({
      baseURL: getNormalizedApiBaseUrl(),
      extraHTTPHeaders: { Authorization: `Bearer ${access_token}` },
    });
    const userBWalletApi = new WalletApi(userBContext);
    const userBBeneficiariesApi = new BeneficiariesApi(userBContext);
    const userBTransfersApi = new TransfersApi(userBContext);

    // Setup User A
    const userAWalletRes = await userA.api.wallet.getMyWallet();
    const userAWallet = await userAWalletRes.json();
    await db.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [userAWallet.id]);
    const userABenRes = await userA.api.beneficiaries.createBeneficiary(
      generateBeneficiaryPayload({ name: 'User A Beneficiary' }),
    );
    const userABen = await userABenRes.json();

    // Setup User B
    const userBWalletRes = await userBWalletApi.getMyWallet();
    const userBWallet = await userBWalletRes.json();
    await db.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [userBWallet.id]);
    const userBBenRes = await userBBeneficiariesApi.createBeneficiary(
      generateBeneficiaryPayload({ name: 'User B Beneficiary' }),
    );
    const userBBen = await userBBenRes.json();

    // Execute transfers concurrently
    const [resA, resB] = await Promise.all([
      userA.api.transfers.createTransfer(
        {
          sourceWalletId: userAWallet.id,
          beneficiaryId: userABen.id,
          sendAmount: 100.0,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('cross-userA'),
      ),
      userBTransfersApi.createTransfer(
        {
          sourceWalletId: userBWallet.id,
          beneficiaryId: userBBen.id,
          sendAmount: 200.0,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('cross-userB'),
      ),
    ]);

    expect(resA.status()).toBe(201);
    expect(resB.status()).toBe(201);

    const dataA: TransferResponse = await resA.json();
    const dataB: TransferResponse = await resB.json();

    // Strict Isolation Verification:
    // User A deducted 100 + 25 = 125 -> 375.00 EUR
    const postWalletA = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [userAWallet.id],
    );
    expect(Number(postWalletA?.balance)).toBe(375.0);

    // User B deducted 200 + 25 = 225 -> 275.00 EUR
    const postWalletB = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [userBWallet.id],
    );
    expect(Number(postWalletB?.balance)).toBe(275.0);

    // Ownership of transactions
    const txA = await db.queryOne<{ userId: string }>(
      'SELECT "userId" FROM transactions WHERE id = $1',
      [dataA.id],
    );
    const txB = await db.queryOne<{ userId: string }>(
      'SELECT "userId" FROM transactions WHERE id = $1',
      [dataB.id],
    );
    expect(txA?.userId).toBe(userA.user.id);
    expect(txB?.userId).toBe(userBId);

    await userBContext.dispose();
  });
});

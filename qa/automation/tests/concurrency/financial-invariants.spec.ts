import { test, expect, AuthenticatedUserSession } from '../../fixtures/api.fixtures';
import { dbClient, DbClient } from '../../database/db-client';
import { CreateBeneficiaryRequest, CreateTransferRequest, TransferResponse } from '../../api/types';

// =========================================================================
// Helpers for Financial Invariants Tests
// =========================================================================

function generateIdempotencyKey(prefix = 'fin-inv'): string {
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
// STEP 5K: Financial Invariants & Mathematical Ledger Integrity Suite
// =========================================================================

test.describe('Step 5K - Financial Invariants & Mathematical Ledger Integrity', () => {
  // =======================================================================
  // 1. Strict Balance Conservation under Concurrent Transfer Bursts
  // =======================================================================
  test('strictly conserves financial balance: initial_balance - sum(debits + fees) == final_balance', async ({
    authUser,
    db,
  }) => {
    // Initial balance: 600.00 EUR
    // Launch 8 concurrent requests with varying amounts (some will exceed remaining funds)
    // Formula: Initial - sum(successful debits + fees) == Final balance
    const initialBalance = 600.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const testAmounts = [100.0, 150.0, 80.0, 120.0, 90.0, 110.0, 70.0, 130.0];
    const fee = 25.0;

    const promises = testAmounts.map((amt, idx) => {
      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount: amt,
        destinationCurrency: 'EUR',
      };
      return authUser.api.transfers.createTransfer(
        payload,
        generateIdempotencyKey(`bal-cons-${idx}`),
      );
    });

    const responses = await Promise.all(promises);

    const successfulResponses = responses.filter((r) => r.status() === 201);
    const rejectedResponses = responses.filter((r) => r.status() === 400);

    // Verify all rejected responses returned insufficient balance
    for (const rej of rejectedResponses) {
      const err = await rej.json();
      expect(err.message).toContain('Insufficient wallet balance');
    }

    // Calculate sum of debited amounts from successful API responses
    const successfulData: TransferResponse[] = await Promise.all(
      successfulResponses.map((r) => r.json()),
    );
    const totalDeductedFromApi = successfulData.reduce(
      (sum, item) => sum + item.sendAmount + item.fee,
      0,
    );

    // Fetch final wallet balance from PostgreSQL
    const finalWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    const actualFinalBalance = Number(finalWallet?.balance);

    // 1. Core Financial Invariant: Initial - Deducted == Final
    const expectedFinalBalance = Math.round((initialBalance - totalDeductedFromApi + Number.EPSILON) * 100) / 100;
    expect(actualFinalBalance).toBe(expectedFinalBalance);

    // 2. Non-negative Invariant: Balance never negative
    expect(actualFinalBalance).toBeGreaterThanOrEqual(0);

    // 3. Database Ledger Invariant: Sum of senderAmount + fee in transactions table matches exactly
    const dbTxRows = await db.query<{ senderAmount: string; fee: string }>(
      'SELECT "senderAmount", fee FROM transactions WHERE "userId" = $1',
      [authUser.user.id],
    );
    expect(dbTxRows.rows.length).toBe(successfulResponses.length);

    const totalDeductedInDb = dbTxRows.rows.reduce(
      (sum, row) => sum + Number(row.senderAmount) + Number(row.fee),
      0,
    );
    expect(Math.round((totalDeductedInDb + Number.EPSILON) * 100) / 100).toBe(totalDeductedFromApi);
  });

  // =======================================================================
  // 2. 1:1:1:1 Transaction Count Consistency Invariant
  // =======================================================================
  test('verifies strict 1:1:1:1 consistency between API responses, DB transactions, debits, and references', async ({
    authUser,
    db,
  }) => {
    // Initial balance: 350.00 EUR
    // 4 concurrent requests of 50.00 EUR + 25.00 EUR fee = 75.00 EUR
    // Max affordable: 350 / 75 = 4 requests (4 * 75 = 300.00 EUR, leaving 50.00 EUR)
    const initialBalance = 350.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const promises = Array.from({ length: 4 }, (_, idx) =>
      authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey(`count-cons-${idx}`),
      ),
    );

    const responses = await Promise.all(promises);
    const successfulResponses = responses.filter((r) => r.status() === 201);
    expect(successfulResponses.length).toBe(4);

    const txDataList: TransferResponse[] = await Promise.all(
      successfulResponses.map((r) => r.json()),
    );

    // Distinct transaction IDs and distinct references
    const distinctApiIds = new Set(txDataList.map((t) => t.id));
    const distinctApiRefs = new Set(txDataList.map((t) => t.reference));
    expect(distinctApiIds.size).toBe(4);
    expect(distinctApiRefs.size).toBe(4);

    // Database check: committed transaction rows for user
    const dbTransactions = await db.query<{ id: string; reference: string }>(
      'SELECT id, reference FROM transactions WHERE "userId" = $1',
      [authUser.user.id],
    );
    expect(dbTransactions.rows.length).toBe(4);

    const distinctDbIds = new Set(dbTransactions.rows.map((r) => r.id));
    const distinctDbRefs = new Set(dbTransactions.rows.map((r) => r.reference));
    expect(distinctDbIds.size).toBe(4);
    expect(distinctDbRefs.size).toBe(4);

    // 1:1 match between API returned IDs and DB rows
    for (const apiId of distinctApiIds) {
      expect(distinctDbIds.has(apiId)).toBe(true);
    }
  });

  // =======================================================================
  // 3. Double-Spending Exhaustion Barrier (Depletion to Zero Followed by Over-Draw Attempts)
  // =======================================================================
  test('exhausts balance to exact zero then rejects all subsequent concurrent overdraw attempts', async ({
    authUser,
    db,
  }) => {
    // Initial balance: 150.00 EUR
    // Stage 1: Two concurrent transfers of 50.00 EUR + 25.00 EUR fee = 75.00 EUR each.
    // Together they consume 150.00 EUR, leaving exactly 0.00 EUR.
    const initialBalance = 150.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const stage1Promises = [
      authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('deplete-1'),
      ),
      authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('deplete-2'),
      ),
    ];

    const stage1Responses = await Promise.all(stage1Promises);
    expect(stage1Responses[0].status()).toBe(201);
    expect(stage1Responses[1].status()).toBe(201);

    // Verify balance is now exactly 0.00 EUR
    const midWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(midWallet?.balance)).toBe(0.0);

    // Stage 2: Immediately launch 4 concurrent transfer attempts against the 0.00 EUR wallet
    const stage2Promises = Array.from({ length: 4 }, (_, idx) =>
      authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 10.0,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey(`overdraw-${idx}`),
      ),
    );

    const stage2Responses = await Promise.all(stage2Promises);

    // ALL stage 2 requests MUST be rejected with 400 Bad Request
    for (const res of stage2Responses) {
      expect(res.status()).toBe(400);
      const err = await res.json();
      expect(err.message).toContain('Insufficient wallet balance');
    }

    // Invariant: Final balance is STILL 0.00 EUR, never negative
    const finalWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(finalWallet?.balance)).toBe(0.0);

    // Invariant: Only the 2 legitimate transactions from Stage 1 exist in DB
    const finalTxCount = await db.queryOne<{ count: string }>(
      'SELECT count(*) FROM transactions WHERE "userId" = $1',
      [authUser.user.id],
    );
    expect(Number(finalTxCount?.count)).toBe(2);
  });

  // =======================================================================
  // 4. Decimal Precision & Fractional Invariant Under Concurrency
  // =======================================================================
  test('maintains exact 2-decimal fractional precision without IEEE 754 floating point drift', async ({
    authUser,
    db,
  }) => {
    // Initial balance: 100.00 EUR
    // 3 concurrent micro-transfers of sendAmount: 0.01 + 25.00 EUR fee = 25.01 EUR each
    // Total deduction: 3 * 25.01 = 75.03 EUR
    // Expected final balance: 100.00 - 75.03 = 24.97 EUR
    const initialBalance = 100.0;
    const sendAmount = 0.01;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const microPromises = Array.from({ length: 3 }, (_, idx) =>
      authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey(`precision-${idx}`),
      ),
    );

    const responses = await Promise.all(microPromises);
    for (const res of responses) {
      expect(res.status()).toBe(201);
      const data: TransferResponse = await res.json();
      expect(data.sendAmount).toBe(0.01);
      expect(data.fee).toBe(25.0);
    }

    // Check DB wallet balance precision
    const postWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(postWallet?.balance)).toBe(24.97);

    // Check via API endpoint
    const walletApiRes = await authUser.api.wallet.getMyWallet();
    expect(walletApiRes.status()).toBe(200);
    const walletApiData = await walletApiRes.json();
    expect(walletApiData.balance).toBe(24.97);
  });
});

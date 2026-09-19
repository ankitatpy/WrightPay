import { test, expect, AuthenticatedUserSession } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient, DbClient } from '../../database/db-client';
import { redisClient } from '../../redis/redis-client';
import { AuthApi, BeneficiariesApi, TransfersApi, WalletApi } from '../../api';
import { config } from '../../config/env.config';
import { CreateBeneficiaryRequest, CreateTransferRequest, TransferResponse } from '../../api/types';

// =========================================================================
// Helpers for Idempotency Race Tests
// =========================================================================

const getNormalizedApiBaseUrl = (): string => {
  return config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
};

function generateIdempotencyKey(prefix = 'idem-race'): string {
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
// STEP 5K: Redis Idempotency Race & Deduplication Test Suite
// =========================================================================

test.describe('Step 5K - Redis Idempotency Race Conditions & Deduplication', () => {
  // =======================================================================
  // 1. Concurrent Identical Idempotency Requests (6 Simultaneous Requests)
  // =======================================================================
  test('safely resolves 6 simultaneous requests with identical payload and Idempotency-Key with zero double debits', async ({
    authUser,
    db,
  }) => {
    // Initial balance: 400.00 EUR
    // Send amount: 50.00 EUR + 25.00 EUR fee = 75.00 EUR
    // Invariant: Exactly ONE debit occurs (400 - 75 = 325.00 EUR)
    // Exactly ONE transaction record created in PostgreSQL
    const initialBalance = 400.0;
    const sendAmount = 50.0;
    const fee = 25.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const sharedKey = generateIdempotencyKey('identical-race');
    const payload: CreateTransferRequest = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary.id,
      sendAmount,
      destinationCurrency: 'EUR',
    };

    const requestCount = 6;
    const promises = Array.from({ length: requestCount }, () =>
      authUser.api.transfers.createTransfer(payload, sharedKey),
    );

    // Launch all 6 identical requests simultaneously
    const responses = await Promise.all(promises);

    // All responses should either be 201 Created (the initial or resolved cached replay)
    // or 409 Conflict if polling loop bounded timeout is reached
    const statusCodes = responses.map((r) => r.status());
    for (const code of statusCodes) {
      expect([201, 409]).toContain(code);
    }

    const successfulResponses = responses.filter((r) => r.status() === 201);
    expect(successfulResponses.length).toBeGreaterThanOrEqual(1);

    // Collect response bodies from all 201 responses
    const successfulData: TransferResponse[] = await Promise.all(
      successfulResponses.map((r) => r.json()),
    );

    // INVARIANT: Every 201 response must refer to the EXACT same transaction
    const authoritativeId = successfulData[0].id;
    const authoritativeRef = successfulData[0].reference;
    for (const data of successfulData) {
      expect(data.id).toBe(authoritativeId);
      expect(data.reference).toBe(authoritativeRef);
      expect(data.sendAmount).toBe(sendAmount);
      expect(data.fee).toBe(fee);
    }

    // FINANCIAL INVARIANT: Wallet is debited EXACTLY ONCE
    const postWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(postWallet?.balance)).toBe(initialBalance - (sendAmount + fee));

    // DATABASE INVARIANT: Exactly one transaction row exists in PostgreSQL
    const txRows = await db.query<{ id: string }>(
      'SELECT id FROM transactions WHERE reference = $1',
      [authoritativeRef],
    );
    expect(txRows.rows.length).toBe(1);
  });

  // =======================================================================
  // 2. Concurrent Conflicting Idempotency Requests (Same Key, Different Payloads)
  // =======================================================================
  test('rejects conflicting concurrent payload with 409 Conflict and executes exactly one transfer', async ({
    authUser,
    db,
  }) => {
    // Initial balance: 400.00 EUR
    // Payload A: 50.00 EUR (total 75.00 EUR)
    // Payload B: 75.00 EUR (total 100.00 EUR)
    // Same Idempotency-Key
    // Expected: Exactly one wins (201), the other receives 409 Conflict
    const initialBalance = 400.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const sharedKey = generateIdempotencyKey('conflict-race');
    const payloadA: CreateTransferRequest = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary.id,
      sendAmount: 50.0,
      destinationCurrency: 'EUR',
    };
    const payloadB: CreateTransferRequest = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary.id,
      sendAmount: 75.0,
      destinationCurrency: 'EUR',
    };

    // Launch both requests simultaneously
    const [resA, resB] = await Promise.all([
      authUser.api.transfers.createTransfer(payloadA, sharedKey),
      authUser.api.transfers.createTransfer(payloadB, sharedKey),
    ]);

    const statuses = [resA.status(), resB.status()];
    // Exactly one 201 Created and one 409 Conflict
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    const winningRes = resA.status() === 201 ? resA : resB;
    const conflictingRes = resA.status() === 409 ? resA : resB;

    const winData: TransferResponse = await winningRes.json();
    const conflictData = await conflictingRes.json();

    // Verify conflict error message
    expect(conflictData.message).toContain(
      'Idempotency key was already used with a different request payload',
    );

    // Financial Invariant: Wallet is debited ONLY for the winning transaction
    const winningDeduction = winData.sendAmount + winData.fee;
    const postWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(postWallet?.balance)).toBe(initialBalance - winningDeduction);

    // Database Invariant: Exactly one transaction row in PostgreSQL
    const txRows = await db.query<{ id: string }>(
      'SELECT id FROM transactions WHERE "userId" = $1',
      [authUser.user.id],
    );
    expect(txRows.rows.length).toBe(1);
    expect(txRows.rows[0].id).toBe(winData.id);
  });

  // =======================================================================
  // 3. Same Idempotency-Key Across Separate Users (Namespace Isolation)
  // =======================================================================
  test('ensures identical Idempotency-Key used concurrently by two users does not collide in Redis', async ({
    playwright,
    apiContext,
    authUser: userA,
    db,
    redis,
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
    const userAWallet = await (await userA.api.wallet.getMyWallet()).json();
    await db.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [userAWallet.id]);
    const userABen = await (
      await userA.api.beneficiaries.createBeneficiary(
        generateBeneficiaryPayload({ name: 'User A Ben' }),
      )
    ).json();

    // Setup User B
    const userBWallet = await (await userBWalletApi.getMyWallet()).json();
    await db.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [userBWallet.id]);
    const userBBen = await (
      await userBBeneficiariesApi.createBeneficiary(
        generateBeneficiaryPayload({ name: 'User B Ben' }),
      )
    ).json();

    // Shared identical idempotency key for both users
    const commonIdemKey = `shared-cross-user-key-${Date.now()}`;

    // Launch both requests simultaneously with the SAME Idempotency-Key
    const [resA, resB] = await Promise.all([
      userA.api.transfers.createTransfer(
        {
          sourceWalletId: userAWallet.id,
          beneficiaryId: userABen.id,
          sendAmount: 60.0,
          destinationCurrency: 'EUR',
        },
        commonIdemKey,
      ),
      userBTransfersApi.createTransfer(
        {
          sourceWalletId: userBWallet.id,
          beneficiaryId: userBBen.id,
          sendAmount: 80.0,
          destinationCurrency: 'EUR',
        },
        commonIdemKey,
      ),
    ]);

    // Both must succeed!
    expect(resA.status()).toBe(201);
    expect(resB.status()).toBe(201);

    const txA: TransferResponse = await resA.json();
    const txB: TransferResponse = await resB.json();

    // Invariant: Two distinct transactions, no cross-talk
    expect(txA.id).not.toBe(txB.id);
    expect(txA.reference).not.toBe(txB.reference);
    expect(txA.sendAmount).toBe(60.0);
    expect(txB.sendAmount).toBe(80.0);

    // Verify Redis namespace isolation: two distinct keys exist
    const redisKeyA = `wrightpay:idempotency:transfer:${userA.user.id}:${commonIdemKey}`;
    const redisKeyB = `wrightpay:idempotency:transfer:${userBId}:${commonIdemKey}`;

    const existsA = await redis.exists(redisKeyA);
    const existsB = await redis.exists(redisKeyB);
    expect(existsA).toBe(true);
    expect(existsB).toBe(true);

    await userBContext.dispose();
  });

  // =======================================================================
  // 4. Sequential Replay After Race Resolution (Cached Response Verification)
  // =======================================================================
  test('serves cached 201 replay following concurrent execution with zero subsequent debits', async ({
    authUser,
    db,
  }) => {
    const initialBalance = 400.0;
    const sendAmount = 45.0;
    const fee = 25.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const key = generateIdempotencyKey('replay-after-race');
    const payload: CreateTransferRequest = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary.id,
      sendAmount,
      destinationCurrency: 'EUR',
    };

    // 1. Concurrent execution
    const [res1, res2] = await Promise.all([
      authUser.api.transfers.createTransfer(payload, key),
      authUser.api.transfers.createTransfer(payload, key),
    ]);

    expect([201, 409]).toContain(res1.status());
    expect([201, 409]).toContain(res2.status());

    // 2. Subsequent sequential replay with exact same key
    const replayRes = await authUser.api.transfers.createTransfer(payload, key);
    expect(replayRes.status()).toBe(201);
    const replayData: TransferResponse = await replayRes.json();

    const initialSuccessfulData: TransferResponse =
      res1.status() === 201 ? await res1.json() : await res2.json();

    expect(replayData.id).toBe(initialSuccessfulData.id);
    expect(replayData.reference).toBe(initialSuccessfulData.reference);

    // Balance invariant: Debited exactly once (400 - 70 = 330.00 EUR)
    const postWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(postWallet?.balance)).toBe(initialBalance - (sendAmount + fee));
  });

  // =======================================================================
  // 5. Redis Idempotency Record Structure & TTL Integrity
  // =======================================================================
  test('confirms Redis idempotency record structure, SHA-256 payload hash, and 24-hour TTL', async ({
    authUser,
    db,
    redis,
  }) => {
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, 300);

    const key = generateIdempotencyKey('record-inspect');
    const payload: CreateTransferRequest = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary.id,
      sendAmount: 35.0,
      destinationCurrency: 'EUR',
    };

    const res = await authUser.api.transfers.createTransfer(payload, key);
    expect(res.status()).toBe(201);
    const transferData: TransferResponse = await res.json();

    const redisKey = `wrightpay:idempotency:transfer:${authUser.user.id}:${key}`;

    // Verify key exists and TTL is in expected range (~86400 seconds)
    const ttl = await redis.ttl(redisKey);
    expect(ttl).toBeGreaterThan(80000);
    expect(ttl).toBeLessThanOrEqual(86400);

    // Verify internal JSON record structure
    const raw = await redis.get(redisKey);
    expect(raw).not.toBeNull();
    const record = JSON.parse(raw!);

    expect(record.status).toBe('COMPLETED');
    expect(record.requestHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
    expect(record.response.id).toBe(transferData.id);
    expect(record.response.reference).toBe(transferData.reference);
    expect(record.createdAt).toBeDefined();
    expect(record.completedAt).toBeDefined();
  });

  // =======================================================================
  // 6. Idempotency Polling Gap on Early Failure (WP-QA-007 Demonstration)
  // =======================================================================
  test('reveals idempotency polling gap: lock deletion on failure causes concurrent requests to stall and return misleading 409 (WP-QA-007)', async ({
    authUser,
    db,
  }) => {
    // Setup wallet with insufficient balance (10.00 EUR)
    // Transfer requires 50.00 EUR + 25.00 EUR fee = 75.00 EUR
    const initialBalance = 10.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const sharedKey = generateIdempotencyKey('early-fail-race');
    const payload: CreateTransferRequest = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary.id,
      sendAmount: 50.0,
      destinationCurrency: 'EUR',
    };

    const startTime = Date.now();
    // Fire two concurrent requests with the same key
    const [res1, res2] = await Promise.all([
      authUser.api.transfers.createTransfer(payload, sharedKey),
      authUser.api.transfers.createTransfer(payload, sharedKey),
    ]);
    const duration = Date.now() - startTime;

    const statuses = [res1.status(), res2.status()];
    // The lock holder fails with 400 Bad Request (Insufficient balance)
    expect(statuses).toContain(400);

    // The concurrent polling request sees the key deleted by the error handler,
    // stalls for the full 2.5s polling loop, and returns 409 Conflict
    expect(statuses).toContain(409);

    const conflictRes = res1.status() === 409 ? res1 : res2;
    const conflictBody = await conflictRes.json();
    expect(conflictBody.message).toContain(
      'A transfer with this idempotency key is currently processing. Please retry shortly.',
    );

    // Bounded polling duration confirmation: 25 * 100ms = ~2.5s
    expect(duration).toBeGreaterThanOrEqual(2300);

    // Invariant: Balance unchanged, zero transactions created
    const postWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(postWallet?.balance)).toBe(initialBalance);
    const txCount = await db.queryOne<{ count: string }>(
      'SELECT count(*) FROM transactions WHERE "userId" = $1',
      [authUser.user.id],
    );
    expect(Number(txCount?.count)).toBe(0);
  });
});

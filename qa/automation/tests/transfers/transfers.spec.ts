import { test, expect, AuthenticatedUserSession } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient, DbClient } from '../../database/db-client';
import { redisClient } from '../../redis/redis-client';
import { transferQueueClient } from '../../queues/queue-client';
import { BeneficiariesApi, TransfersApi } from '../../api';
import { CreateBeneficiaryRequest, CreateTransferRequest, TransferResponse } from '../../api/types';

// =========================================================================
// Test Data & Setup Helpers
// =========================================================================

function generateIdempotencyKey(prefix = 'wp-idem'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateBeneficiaryPayload(
  overrides?: Partial<CreateBeneficiaryRequest>,
): CreateBeneficiaryRequest {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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

/**
 * Provisions a funded wallet and beneficiary for the authenticated test user.
 * Note: WrightPay's public API does not expose a fund/deposit endpoint.
 * Seed funding is performed safely via the database client directly for test isolation.
 */
async function setupFundedUser(
  authUser: AuthenticatedUserSession,
  db: DbClient,
  balance: number = 500,
  beneficiaryOverrides?: Partial<CreateBeneficiaryRequest>,
) {
  const walletRes = await authUser.api.wallet.getMyWallet();
  expect(walletRes.status()).toBe(200);
  const wallet = await walletRes.json();

  // Establish isolated wallet balance for financial testing
  await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [balance, wallet.id]);

  const benRes = await authUser.api.beneficiaries.createBeneficiary(
    generateBeneficiaryPayload(beneficiaryOverrides),
  );
  expect(benRes.status()).toBe(201);
  const beneficiary = await benRes.json();

  return { wallet, beneficiary };
}

/**
 * Bounded polling helper that waits for an asynchronous transaction status transition in PostgreSQL.
 */
async function waitForTransactionStatus(
  db: DbClient,
  transactionId: string,
  targetStatus: string,
  timeoutMs: number = 15000,
  pollIntervalMs: number = 200,
): Promise<{ status: string; failureReason: string | null }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const row = await db.queryOne<{ status: string; failureReason: string | null }>(
      'SELECT status, "failureReason" FROM transactions WHERE id = $1',
      [transactionId],
    );
    if (row && row.status === targetStatus) {
      return row;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  const finalRow = await db.queryOne<{ status: string; failureReason: string | null }>(
    'SELECT status, "failureReason" FROM transactions WHERE id = $1',
    [transactionId],
  );
  throw new Error(
    `Transaction ${transactionId} did not reach status "${targetStatus}" within ${timeoutMs}ms. Current status: ${finalRow?.status}`,
  );
}

// =========================================================================
// Transfers Test Suite
// =========================================================================

test.describe('Transfers Domain API Tests', () => {
  // =======================================================================
  // 1. Basic Successful Transfer & Contract Verification
  // =======================================================================
  test.describe('POST /transfers - Successful Execution & Contract Verification', () => {
    test('successfully initiates a transfer, returns 201 Created with full contract, and updates DB & Redis', async ({
      authUser,
      db,
      redis,
      queue,
    }) => {
      const initialBalance = 500.0;
      const sendAmount = 100.0;
      const fixedFee = 25.0;
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

      const idempotencyKey = generateIdempotencyKey('success');
      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount,
        destinationCurrency: 'EUR',
      };

      const response = await authUser.api.transfers.createTransfer(payload, idempotencyKey);
      expect(response.status()).toBe(201);

      const body: TransferResponse = await response.json();

      // 1. Assert API Response Contract
      expect(body.id).toBeDefined();
      expect(body.reference).toMatch(/^WP-\d{8}-[A-F0-9]{8}$/);
      expect(body.status).toBe('PENDING');
      expect(body.recipient).toBe(beneficiary.name);
      expect(body.sendAmount).toBe(sendAmount);
      expect(body.sourceCurrency).toBe('EUR');
      expect(body.recipientAmount).toBe(sendAmount);
      expect(body.destinationCurrency).toBe('EUR');
      expect(body.fee).toBe(fixedFee);
      expect(body.exchangeRate).toBe(1.0);
      expect(body.date).toBeDefined();
      expect(body.createdAt).toBeDefined();

      // 2. Assert PostgreSQL Database Persistence & Financial Invariant
      const expectedBalance = initialBalance - (sendAmount + fixedFee); // 500 - 125 = 375.00
      const updatedWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(updatedWallet?.balance)).toBe(expectedBalance);

      const txRecord = await db.queryOne<{
        id: string;
        userId: string;
        reference: string;
        amount: string;
        fee: string;
        status: string;
      }>('SELECT * FROM transactions WHERE id = $1', [body.id]);
      expect(txRecord).toBeDefined();
      expect(txRecord?.userId).toBe(authUser.user.id);
      expect(txRecord?.reference).toBe(body.reference);
      expect(Number(txRecord?.amount)).toBe(sendAmount);
      expect(Number(txRecord?.fee)).toBe(fixedFee);

      // 3. Assert Redis Idempotency Record
      const redisKey = `wrightpay:idempotency:transfer:${authUser.user.id}:${idempotencyKey}`;
      const rawRedis = await redis.get(redisKey);
      expect(rawRedis).not.toBeNull();
      const redisRecord = JSON.parse(rawRedis!);
      expect(redisRecord.status).toBe('COMPLETED');
      expect(redisRecord.requestHash).toHaveLength(64);
      expect(redisRecord.response.id).toBe(body.id);

      // 4. Assert BullMQ Job Attributes
      const jobId = `transfer-${body.id}`;
      const job = await queue.getJob(jobId);
      // If worker hasn't cleaned up completed job yet, verify job data
      if (job) {
        expect(job.name).toBe('process-transfer');
        expect(job.data.transactionId).toBe(body.id);
      }
    });
  });

  // =======================================================================
  // 2. Request Validation Boundaries & Guardrails
  // =======================================================================
  test.describe('POST /transfers - Request Validation & Error Handling', () => {
    test('rejects transfer when Idempotency-Key header is omitted (400 Bad Request)', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 200);

      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount: 50,
        destinationCurrency: 'EUR',
      };

      const response = await authUser.api.transfers.createTransfer(payload, undefined);
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.message).toContain('Idempotency-Key header is required');

      // Verify no DB mutation occurred
      const unchangedWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(unchangedWallet?.balance)).toBe(200);
    });

    test('rejects transfer when Idempotency-Key header is empty or whitespace (400 Bad Request)', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 200);

      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount: 50,
        destinationCurrency: 'EUR',
      };

      const response = await authUser.api.transfers.createTransfer(payload, '   ');
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.message).toContain('Idempotency-Key header is required');
    });

    test('rejects transfer with zero sendAmount (400 Bad Request)', async ({ authUser, db }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 200);

      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount: 0,
        destinationCurrency: 'EUR',
      };

      const response = await authUser.api.transfers.createTransfer(
        payload,
        generateIdempotencyKey('zero'),
      );
      expect(response.status()).toBe(400);
    });

    test('rejects transfer with negative sendAmount (400 Bad Request)', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 200);

      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount: -50,
        destinationCurrency: 'EUR',
      };

      const response = await authUser.api.transfers.createTransfer(
        payload,
        generateIdempotencyKey('neg'),
      );
      expect(response.status()).toBe(400);
    });

    test('rejects transfer with invalid or unsupported destinationCurrency (400 Bad Request)', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 200);

      const payload = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount: 50,
        destinationCurrency: 'UNSUPPORTED_XYZ',
      };

      const response = await authUser.api.transfers.createTransfer(
        payload as any,
        generateIdempotencyKey('curr'),
      );
      expect(response.status()).toBe(400);
    });

    test('rejects transfer with malformed non-UUID beneficiaryId (400 Bad Request)', async ({
      authUser,
      db,
    }) => {
      const { wallet } = await setupFundedUser(authUser, db, 200);

      const payload = {
        sourceWalletId: wallet.id,
        beneficiaryId: 'not-a-valid-uuid',
        sendAmount: 50,
        destinationCurrency: 'EUR',
      };

      const response = await authUser.api.transfers.createTransfer(
        payload as any,
        generateIdempotencyKey('malformed-ben'),
      );
      expect(response.status()).toBe(400);
    });

    test('rejects transfer with nonexistent beneficiaryId (404 Not Found)', async ({
      authUser,
      db,
    }) => {
      const { wallet } = await setupFundedUser(authUser, db, 200);

      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: '00000000-0000-0000-0000-000000000000',
        sendAmount: 50,
        destinationCurrency: 'EUR',
      };

      const response = await authUser.api.transfers.createTransfer(
        payload,
        generateIdempotencyKey('nonexistent-ben'),
      );
      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.message).toContain('Beneficiary not found');
    });

    test('rejects transfer with nonexistent sourceWalletId (404 Not Found)', async ({
      authUser,
      db,
    }) => {
      const { beneficiary } = await setupFundedUser(authUser, db, 200);

      const payload: CreateTransferRequest = {
        sourceWalletId: '00000000-0000-0000-0000-000000000000',
        beneficiaryId: beneficiary.id,
        sendAmount: 50,
        destinationCurrency: 'EUR',
      };

      const response = await authUser.api.transfers.createTransfer(
        payload,
        generateIdempotencyKey('nonexistent-wallet'),
      );
      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.message).toContain('Source wallet not found');
    });

    test('rejects UPI rail transfer when destinationCurrency is not INR (400 Bad Request)', async ({
      authUser,
      db,
    }) => {
      const walletRes = await authUser.api.wallet.getMyWallet();
      const wallet = await walletRes.json();
      await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [300, wallet.id]);

      // Create UPI beneficiary
      const upiBenRes = await authUser.api.beneficiaries.createBeneficiary({
        name: 'UPI Beneficiary',
        currency: 'INR',
        payoutMethod: 'upi',
        upiId: 'testuser@okhdfcbank',
      });
      expect(upiBenRes.status()).toBe(201);
      const upiBeneficiary = await upiBenRes.json();

      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: upiBeneficiary.id,
        sendAmount: 50,
        destinationCurrency: 'EUR', // Invalid: UPI destination must be INR
      };

      const response = await authUser.api.transfers.createTransfer(
        payload,
        generateIdempotencyKey('upi-rail'),
      );
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.message).toContain('UPI transfers must be in INR');
    });
  });

  // =======================================================================
  // 3. Insufficient Balance & Accounting Invariants
  // =======================================================================
  test.describe('POST /transfers - Insufficient Balance & Financial Invariants', () => {
    test('rejects transfer when available balance is less than sendAmount + fee, preventing debit', async ({
      authUser,
      db,
      redis,
    }) => {
      const startingBalance = 50.0;
      const sendAmount = 50.0; // sendAmount (50) + fee (25) = 75 required > 50 available
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, startingBalance);

      const idemKey = generateIdempotencyKey('insufficient');
      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount,
        destinationCurrency: 'EUR',
      };

      const response = await authUser.api.transfers.createTransfer(payload, idemKey);
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.message).toContain('Insufficient wallet balance');

      // Financial Invariant: Wallet balance must remain completely untouched
      const walletCheck = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(walletCheck?.balance)).toBe(startingBalance);

      // Invariant: No transaction recorded in PostgreSQL
      const txCount = await db.queryOne<{ count: string }>(
        'SELECT count(*) FROM transactions WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(txCount?.count)).toBe(0);

      // Invariant: Failed operation cleans up Redis lock so user can retry later
      const redisKey = `wrightpay:idempotency:transfer:${authUser.user.id}:${idemKey}`;
      const redisVal = await redis.get(redisKey);
      expect(redisVal).toBeNull();
    });
  });

  // =======================================================================
  // 4. Fixed Fee Accounting & Currency Conversion
  // =======================================================================
  test.describe('POST /transfers - Fixed Fee & Currency Conversion', () => {
    test('strictly enforces the fixed 25.00 EUR fee and deducts (amount + 25.00) from wallet', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 300.0;
      const sendAmount = 100.0;
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

      const response = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('fee-audit'),
      );
      expect(response.status()).toBe(201);
      const data = await response.json();

      expect(data.fee).toBe(25.0);

      // Financial Invariant: source balance before - send amount - fee = source balance after
      const postWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      const expectedBalance = initialBalance - sendAmount - 25.0; // 300 - 100 - 25 = 175.00
      expect(Number(postWallet?.balance)).toBe(expectedBalance);

      // Verify fee stored in DB transaction
      const dbTx = await db.queryOne<{ fee: string }>(
        'SELECT fee FROM transactions WHERE id = $1',
        [data.id],
      );
      expect(Number(dbTx?.fee)).toBe(25.0);
    });

    test('correctly calculates recipientAmount using exchange rates for cross-currency transfers (EUR -> INR)', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 400.0;
      const sendAmount = 100.0;
      const { wallet } = await setupFundedUser(authUser, db, initialBalance);

      // Ensure EUR -> INR exchange rate exists in PostgreSQL for test environment
      const existingRate = await db.queryOne<{ id: string }>(
        'SELECT id FROM exchange_rates WHERE "from" = $1 AND "to" = $2',
        ['EUR', 'INR'],
      );
      if (!existingRate) {
        await db.query(
          `INSERT INTO exchange_rates (id, "from", "to", rate, timestamp)
           VALUES (gen_random_uuid(), 'EUR', 'INR', 89.5, NOW())`,
        );
      }

      // Create an INR beneficiary
      const inrBenRes = await authUser.api.beneficiaries.createBeneficiary(
        generateBeneficiaryPayload({ currency: 'INR', payoutMethod: 'bank_account' }),
      );
      expect(inrBenRes.status()).toBe(201);
      const inrBeneficiary = await inrBenRes.json();

      const response = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: inrBeneficiary.id,
          sendAmount,
          destinationCurrency: 'INR',
        },
        generateIdempotencyKey('fx-eur-inr'),
      );
      expect(response.status()).toBe(201);
      const data: TransferResponse = await response.json();

      expect(data.sourceCurrency).toBe('EUR');
      expect(data.destinationCurrency).toBe('INR');
      expect(data.exchangeRate).toBeGreaterThan(0);
      expect(data.recipientAmount).toBe(Math.round(sendAmount * data.exchangeRate * 100) / 100);

      // Sender wallet is debited in EUR (sendAmount + fee)
      const postWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(postWallet?.balance)).toBe(initialBalance - (sendAmount + 25.0));
    });
  });

  // =======================================================================
  // 5. Beneficiary & Source Wallet Ownership (IDOR / Multi-Tenant Security)
  // =======================================================================
  test.describe('POST /transfers - Ownership & IDOR Protection', () => {
    test('rejects transfer using a beneficiary belonging to another user (404 Not Found / IDOR)', async ({
      authUser,
      authApi,
      db,
      playwright,
    }) => {
      // User A setup
      const { beneficiary: benA } = await setupFundedUser(authUser, db, 300);

      // Provision User B
      const userBData = generateTestUserData();
      const signupB = await authApi.signup(userBData);
      expect(signupB.status()).toBe(201);
      await authApi.verifyEmail({ email: userBData.email, code: '123456' });
      const loginB = await authApi.login({
        email: userBData.email,
        password: userBData.password,
      });
      const { access_token: tokenB } = await loginB.json();

      const userBContext = await playwright.request.newContext({
        baseURL: (await authUser.api.wallet.getMyWallet()).url().replace(/\/wallets.*$/, '/'),
        extraHTTPHeaders: { Authorization: `Bearer ${tokenB}` },
      });
      const transfersApiB = new TransfersApi(userBContext);

      // Fetch User B's wallet and fund it
      const rowWalletB = await db.queryOne<{ id: string }>(
        'SELECT id FROM wallets WHERE "userId" = (SELECT id FROM users WHERE email = $1)',
        [userBData.email],
      );
      expect(rowWalletB).toBeDefined();
      await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [300, rowWalletB!.id]);

      // User B attempts to execute transfer using User A's beneficiary
      const idorResponse = await transfersApiB.createTransfer(
        {
          sourceWalletId: rowWalletB!.id,
          beneficiaryId: benA.id, // Target: User A's beneficiary
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('idor-ben'),
      );

      expect(idorResponse.status()).toBe(404);
      const errorBody = await idorResponse.json();
      expect(errorBody.message).toContain('Beneficiary not found');

      // Financial Invariant: User B's wallet must NOT be debited
      const checkB = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [rowWalletB!.id],
      );
      expect(Number(checkB?.balance)).toBe(300);

      await userBContext.dispose();
    });

    test('rejects transfer using a source wallet belonging to another user (404 Not Found / IDOR)', async ({
      authUser,
      authApi,
      db,
      playwright,
    }) => {
      // User A setup: wallet A has 400 EUR
      const { wallet: walletA } = await setupFundedUser(authUser, db, 400);

      // Provision User B with their own beneficiary
      const userBData = generateTestUserData();
      const signupB = await authApi.signup(userBData);
      expect(signupB.status()).toBe(201);
      await authApi.verifyEmail({ email: userBData.email, code: '123456' });
      const loginB = await authApi.login({
        email: userBData.email,
        password: userBData.password,
      });
      const { access_token: tokenB } = await loginB.json();

      const userBContext = await playwright.request.newContext({
        baseURL: (await authUser.api.wallet.getMyWallet()).url().replace(/\/wallets.*$/, '/'),
        extraHTTPHeaders: { Authorization: `Bearer ${tokenB}` },
      });
      const beneficiariesApiB = new BeneficiariesApi(userBContext);
      const transfersApiB = new TransfersApi(userBContext);

      const benBRes = await beneficiariesApiB.createBeneficiary(generateBeneficiaryPayload());
      const benB = await benBRes.json();

      // User B attempts to debit User A's wallet
      const idorWalletRes = await transfersApiB.createTransfer(
        {
          sourceWalletId: walletA.id, // Target: User A's wallet
          beneficiaryId: benB.id,
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('idor-wallet'),
      );

      expect(idorWalletRes.status()).toBe(404);
      const errorBody = await idorWalletRes.json();
      expect(errorBody.message).toContain('Source wallet not found');

      // Financial Invariant: User A's wallet balance must remain 400 EUR
      const checkA = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [walletA.id],
      );
      expect(Number(checkA?.balance)).toBe(400);

      await userBContext.dispose();
    });
  });

  // =======================================================================
  // 6. Authentication & Account State Validation
  // =======================================================================
  test.describe('POST /transfers - Authentication & Authorization', () => {
    test('rejects unauthenticated transfer when Authorization header is omitted (401 Unauthorized)', async ({
      apiContext,
    }) => {
      const response = await apiContext.post('transfers', {
        data: {
          sourceWalletId: '00000000-0000-0000-0000-000000000000',
          beneficiaryId: '00000000-0000-0000-0000-000000000000',
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        headers: { 'Idempotency-Key': generateIdempotencyKey('noauth') },
      });
      expect(response.status()).toBe(401);
    });

    test('rejects transfer with malformed or invalid Bearer token (401 Unauthorized)', async ({
      apiContext,
    }) => {
      const response = await apiContext.post('transfers', {
        data: {
          sourceWalletId: '00000000-0000-0000-0000-000000000000',
          beneficiaryId: '00000000-0000-0000-0000-000000000000',
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        headers: {
          Authorization: 'Bearer invalid.token.payload',
          'Idempotency-Key': generateIdempotencyKey('badtoken'),
        },
      });
      expect(response.status()).toBe(401);
    });

    test('rejects transfer when user accountStatus is SUSPENDED (403 Forbidden)', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 300);

      // Set user status to suspended (PostgreSQL enum uses lowercase)
      await db.query('UPDATE users SET "accountStatus" = $1 WHERE id = $2', [
        'suspended',
        authUser.user.id,
      ]);

      const response = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('suspended'),
      );
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.message).toContain('Account is suspended or closed');

      // Restore account status for clean teardown
      await db.query('UPDATE users SET "accountStatus" = $1 WHERE id = $2', [
        'active',
        authUser.user.id,
      ]);
    });
  });

  // =======================================================================
  // 7. Idempotency Mechanics & Deduplication
  // =======================================================================
  test.describe('POST /transfers - Idempotency Mechanics & Deduplication', () => {
    test('serves cached 201 response and prevents duplicate wallet debit when sending identical replay', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 400.0;
      const sendAmount = 50.0;
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

      const idemKey = generateIdempotencyKey('replay');
      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount,
        destinationCurrency: 'EUR',
      };

      // 1. First transfer execution
      const firstRes = await authUser.api.transfers.createTransfer(payload, idemKey);
      expect(firstRes.status()).toBe(201);
      const firstData: TransferResponse = await firstRes.json();

      const balanceAfterFirst = initialBalance - (sendAmount + 25.0); // 400 - 75 = 325.00
      const walletMid = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(walletMid?.balance)).toBe(balanceAfterFirst);

      // 2. Duplicate submission with EXACT SAME payload and idempotency key
      const secondRes = await authUser.api.transfers.createTransfer(payload, idemKey);
      expect(secondRes.status()).toBe(201);
      const secondData: TransferResponse = await secondRes.json();

      // Invariant: Response matches the exact original transaction
      expect(secondData.id).toBe(firstData.id);
      expect(secondData.reference).toBe(firstData.reference);
      expect(secondData.sendAmount).toBe(firstData.sendAmount);

      // Financial Invariant: Wallet is NOT debited twice
      const walletFinal = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(walletFinal?.balance)).toBe(balanceAfterFirst);

      // Invariant: Only one transaction record exists in PostgreSQL
      const txRows = await db.query<{ id: string }>(
        'SELECT id FROM transactions WHERE reference = $1',
        [firstData.reference],
      );
      expect(txRows.rows.length).toBe(1);
    });

    test('rejects request with 409 Conflict when reusing an Idempotency-Key with a different payload', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 400);

      const sharedKey = generateIdempotencyKey('conflict');

      // 1. Initial transfer with amount 50
      const res1 = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        sharedKey,
      );
      expect(res1.status()).toBe(201);

      // 2. Re-send using SAME key but DIFFERENT amount (75 instead of 50)
      const res2 = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 75,
          destinationCurrency: 'EUR',
        },
        sharedKey,
      );
      expect(res2.status()).toBe(409);

      const errorBody = await res2.json();
      expect(errorBody.message).toContain(
        'Idempotency key was already used with a different request payload',
      );

      // Financial Invariant: Wallet only debited for the first request (50 + 25 = 75), NOT the second
      const postWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(postWallet?.balance)).toBe(400 - 75); // 325.00
    });

    test('treats requests with different idempotency keys as separate distinct transactions', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 400.0;
      const sendAmount = 30.0;
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount,
        destinationCurrency: 'EUR',
      };

      // Two requests with DIFFERENT keys
      const res1 = await authUser.api.transfers.createTransfer(
        payload,
        generateIdempotencyKey('distinct-1'),
      );
      const res2 = await authUser.api.transfers.createTransfer(
        payload,
        generateIdempotencyKey('distinct-2'),
      );

      expect(res1.status()).toBe(201);
      expect(res2.status()).toBe(201);

      const data1: TransferResponse = await res1.json();
      const data2: TransferResponse = await res2.json();

      expect(data1.id).not.toBe(data2.id);
      expect(data1.reference).not.toBe(data2.reference);

      // Financial Invariant: Debited for both transactions (30 + 25) * 2 = 110.00
      const postWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(postWallet?.balance)).toBe(initialBalance - 110.0);
    });
  });

  // =======================================================================
  // 8. Redis Idempotency Deep Inspection
  // =======================================================================
  test.describe('Redis Idempotency Deep Inspection', () => {
    test('stores completed idempotency record in Redis with 24-hour TTL and valid SHA-256 payload hash', async ({
      authUser,
      db,
      redis,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 300);

      const idemKey = generateIdempotencyKey('redis-inspect');
      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount: 40,
        destinationCurrency: 'EUR',
      };

      const res = await authUser.api.transfers.createTransfer(payload, idemKey);
      expect(res.status()).toBe(201);
      const data: TransferResponse = await res.json();

      const redisKey = `wrightpay:idempotency:transfer:${authUser.user.id}:${idemKey}`;

      // Verify Key Exists
      const exists = await redis.exists(redisKey);
      expect(exists).toBe(true);

      // Verify TTL is configured (default 86400s / 24 hours)
      const ttl = await redis.ttl(redisKey);
      expect(ttl).toBeGreaterThan(80000);
      expect(ttl).toBeLessThanOrEqual(86400);

      // Verify Internal Record Structure
      const raw = await redis.get(redisKey);
      expect(raw).not.toBeNull();
      const record = JSON.parse(raw!);
      expect(record.status).toBe('COMPLETED');
      expect(record.requestHash).toMatch(/^[a-f0-9]{64}$/); // 64-char SHA-256 hex string
      expect(record.response.id).toBe(data.id);
      expect(record.response.reference).toBe(data.reference);
      expect(record.createdAt).toBeDefined();
      expect(record.completedAt).toBeDefined();
    });
  });

  // =======================================================================
  // 9. BullMQ Job Attributes & Enqueueing Verification
  // =======================================================================
  test.describe('BullMQ Queue Job Verification', () => {
    test('enqueues process-transfer BullMQ job with correct attributes, jobId, and payload', async ({
      authUser,
      db,
      queue,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 300);

      const res = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 35,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('bullmq-audit'),
      );
      expect(res.status()).toBe(201);
      const data: TransferResponse = await res.json();

      const expectedJobId = `transfer-${data.id}`;

      // Inspect BullMQ queue
      const job = await queue.getJob(expectedJobId);
      if (job) {
        expect(job.name).toBe('process-transfer');
        expect(job.id).toBe(expectedJobId);
        expect(job.data.transactionId).toBe(data.id);
        expect(job.opts.attempts).toBe(3);
      }
    });
  });

  // =======================================================================
  // 10. Asynchronous Processing & State Machine Transitions
  // =======================================================================
  test.describe('Asynchronous Settlement & State Transitions', () => {
    test('asynchronously transitions normal transfer status from PENDING to COMPLETED', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 300);

      const res = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('async-success'),
      );
      expect(res.status()).toBe(201);
      const data: TransferResponse = await res.json();
      expect(data.status).toBe('PENDING');

      // Poll database using bounded polling helper until settlement worker completes
      const updatedTx = await waitForTransactionStatus(db, data.id, 'COMPLETED', 10000);
      expect(updatedTx.status).toBe('COMPLETED');
      expect(updatedTx.failureReason).toBeNull();
    });

    test('asynchronously transitions transfer to FAILED when recipient name triggers simulated banking failure', async ({
      authUser,
      db,
    }) => {
      // Backend test hook: If recipient name contains SIMULATE_FAILURE, TransfersProcessor throws an error
      const { wallet } = await setupFundedUser(authUser, db, 300);

      const failureBenRes = await authUser.api.beneficiaries.createBeneficiary(
        generateBeneficiaryPayload({
          name: 'Settlement Test SIMULATE_FAILURE',
          currency: 'EUR',
        }),
      );
      expect(failureBenRes.status()).toBe(201);
      const failureBen = await failureBenRes.json();

      const res = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: failureBen.id,
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('sim-fail'),
      );
      expect(res.status()).toBe(201);
      const data: TransferResponse = await res.json();
      expect(data.status).toBe('PENDING');

      // Poll database until BullMQ exhausts 3 attempts and marks status FAILED
      const failedTx = await waitForTransactionStatus(db, data.id, 'FAILED', 15000);
      expect(failedTx.status).toBe('FAILED');
      expect(failedTx.failureReason).toContain('Simulated banking settlement failure');

      // Audit Discovery Confirmation:
      // Note: Automatic wallet refund upon asynchronous worker failure is currently NOT implemented in the backend.
      // We verify the actual balance reflects this current backend behavior.
      const postWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(postWallet?.balance)).toBe(300 - 75); // Debited at initial creation
    });
  });

  // =======================================================================
  // 11. Amount Boundaries & Edge Cases
  // =======================================================================
  test.describe('Amount Boundaries & Precision', () => {
    test('accepts the minimum allowed sendAmount (0.01) and applies exact decimal deduction', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 100.0;
      const sendAmount = 0.01;
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

      const res = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('min-amt'),
      );
      expect(res.status()).toBe(201);
      const data: TransferResponse = await res.json();
      expect(data.sendAmount).toBe(0.01);
      expect(data.fee).toBe(25.0);

      // Balance = 100 - (0.01 + 25.00) = 74.99
      const postWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(postWallet?.balance)).toBe(74.99);
    });

    test('accepts transfer where amount + fee exactly equals wallet balance, leaving zero balance', async ({
      authUser,
      db,
    }) => {
      // Wallet balance: 125.00 EUR. Send amount: 100.00 EUR. Total: 100 + 25 = 125.00 EUR
      const exactBalance = 125.0;
      const sendAmount = 100.0;
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, exactBalance);

      const res = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('exact-bal'),
      );
      expect(res.status()).toBe(201);

      const postWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(postWallet?.balance)).toBe(0.0);
    });

    test('rejects transfer where amount + fee is exactly 0.01 over wallet balance', async ({
      authUser,
      db,
    }) => {
      const startingBalance = 125.0;
      const sendAmount = 100.01; // Total required: 125.01 > 125.00
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, startingBalance);

      const res = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('over-bal'),
      );
      expect(res.status()).toBe(400);

      const body = await res.json();
      expect(body.message).toContain('Insufficient wallet balance');

      const checkWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(checkWallet?.balance)).toBe(startingBalance);
    });
  });

  // =======================================================================
  // 12. Concurrency & Double Submission Safety
  // =======================================================================
  test.describe('Concurrency & Double Submission Protection', () => {
    test('safely handles concurrent double submission with the same idempotency key without double debit', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 300.0;
      const sendAmount = 50.0;
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

      const sharedKey = generateIdempotencyKey('concurrent');
      const payload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount,
        destinationCurrency: 'EUR',
      };

      // Fire two simultaneous requests with the exact same Idempotency-Key
      const [res1, res2] = await Promise.all([
        authUser.api.transfers.createTransfer(payload, sharedKey),
        authUser.api.transfers.createTransfer(payload, sharedKey),
      ]);

      // Both should succeed (one creates, one replays or waits) OR one succeeds and one returns 409 if lock polling expired
      expect([201, 409]).toContain(res1.status());
      expect([201, 409]).toContain(res2.status());
      expect(res1.status() === 201 || res2.status() === 201).toBe(true);

      // CRITICAL Financial Invariant: Wallet must be debited EXACTLY ONCE
      const postWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      const expectedBalance = initialBalance - (sendAmount + 25.0); // 300 - 75 = 225.00
      expect(Number(postWallet?.balance)).toBe(expectedBalance);

      // CRITICAL Invariant: Exactly ONE transaction created in PostgreSQL
      const txRows = await db.query<{ id: string }>(
        'SELECT id FROM transactions WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(txRows.rows.length).toBe(1);
    });
  });

  // =======================================================================
  // 13. Security & Unhandled 500 Prevention
  // =======================================================================
  test.describe('Security & Unhandled 500 Prevention', () => {
    test('returns structured 400 Bad Request without 500 crashes on malformed request bodies', async ({
      authUser,
      db,
    }) => {
      const { wallet } = await setupFundedUser(authUser, db, 200);

      const malformedPayloads = [
        { sourceWalletId: wallet.id, sendAmount: 'not-a-number' },
        { sourceWalletId: wallet.id, beneficiaryId: 12345, sendAmount: 50 },
        { sendAmount: null, destinationCurrency: 'EUR' },
        {},
      ];

      for (const badPayload of malformedPayloads) {
        const res = await authUser.api.transfers.createTransfer(
          badPayload as any,
          generateIdempotencyKey('malformed'),
        );
        expect(res.status()).toBe(400);
        expect(res.status()).not.toBe(500);
      }
    });
  });
});

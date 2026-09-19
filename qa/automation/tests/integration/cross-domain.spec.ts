import { test, expect, AuthenticatedUserSession } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient, DbClient } from '../../database/db-client';
import { redisClient } from '../../redis/redis-client';
import { transferQueueClient } from '../../queues/queue-client';
import { WalletApi, BeneficiariesApi, TransfersApi, TransactionsApi } from '../../api';
import { config } from '../../config/env.config';
import {
  CreateBeneficiaryRequest,
  CreateTransferRequest,
  TransferResponse,
  TransactionResponse,
  ExchangeRateQuoteResponse,
} from '../../api/types';

// =============================================================================
// Helper Functions for Cross-Domain Integration Tests
// =============================================================================

const getNormalizedApiBaseUrl = (): string => {
  return config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
};

function generateIdempotencyKey(prefix = 'int-flow'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateBeneficiaryPayload(
  overrides?: Partial<CreateBeneficiaryRequest>,
): CreateBeneficiaryRequest {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const isUpi = overrides?.payoutMethod === 'upi' || overrides?.payoutMethod === 'UPI';
  return {
    name: overrides?.name || `Beneficiary_${unique}`,
    currency: overrides?.currency || (isUpi ? 'INR' : 'EUR'),
    payoutMethod: overrides?.payoutMethod || 'bank_account',
    accountNumber: isUpi ? undefined : (overrides?.accountNumber || `IT12A${unique}`),
    bankCode: isUpi ? undefined : (overrides?.bankCode || 'UNCRITM1'),
    bankName: isUpi ? undefined : (overrides?.bankName || 'UniCredit Test Bank'),
    upiId: isUpi ? (overrides?.upiId || `user${unique}@okhdfcbank`) : undefined,
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

  // Establish isolated initial wallet balance for financial testing
  await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [balance, wallet.id]);

  const benRes = await authUser.api.beneficiaries.createBeneficiary(
    generateBeneficiaryPayload(beneficiaryOverrides),
  );
  expect(benRes.status()).toBe(201);
  const beneficiary = await benRes.json();

  return { wallet, beneficiary };
}

async function waitForTransactionStatusApi(
  transactionsApi: TransactionsApi,
  transactionId: string,
  targetStatus: string,
  timeoutMs = 15000,
  pollIntervalMs = 200,
): Promise<TransactionResponse> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await transactionsApi.getTransactionById(transactionId);
    if (res.status() === 200) {
      const data: TransactionResponse = await res.json();
      if (data.status === targetStatus) {
        return data;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  const finalRes = await transactionsApi.getTransactionById(transactionId);
  const finalData = finalRes.status() === 200 ? await finalRes.json() : null;
  throw new Error(
    `Transaction ${transactionId} did not reach status "${targetStatus}" within ${timeoutMs}ms. Current status: ${finalData?.status}`,
  );
}

// =============================================================================
// STEP 5I: Cross-Domain Integration Test Suite
// =============================================================================

test.describe('Cross-Domain Integration Testing (Step 5I)', () => {
  // Ensure canonical EUR -> INR and EUR -> USD rates exist in PostgreSQL idempotently
  test.beforeAll(async () => {
    const canonicalRates = [
      { from: 'EUR', to: 'INR', rate: 89.5 },
      { from: 'EUR', to: 'USD', rate: 1.08 },
    ];
    for (const r of canonicalRates) {
      const existing = await dbClient.queryOne<{ id: string }>(
        'SELECT id FROM exchange_rates WHERE "from" = $1 AND "to" = $2',
        [r.from, r.to],
      );
      if (!existing) {
        await dbClient.query(
          `INSERT INTO exchange_rates (id, "from", "to", rate, timestamp, "createdAt")
           VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
          [r.from, r.to, r.rate],
        );
      }
    }
  });

  // ===========================================================================
  // FLOW 1: Complete Success Journey
  // ===========================================================================
  test.describe('Flow 1: Complete Success Journey (End-to-End User Lifecycle & Settlement)', () => {
    test('executes full realistic transfer journey across Auth, Wallet, Beneficiaries, FX, Transfers, Queue, and Transactions', async ({
      playwright,
      authApi,
      exchangeRatesApi,
      db,
    }) => {
      // 1. Create a brand new unique user via API
      const testUserData = generateTestUserData();
      const signupRes = await authApi.signup(testUserData);
      expect(signupRes.status()).toBe(201);
      const signupData = await signupRes.json();
      const userId = signupData.userId;
      expect(userId).toBeDefined();

      // 2. Verify email through API
      let verifyRes = await authApi.verifyEmail({
        email: testUserData.email,
        code: '123456',
      });
      if (!verifyRes.ok()) {
        const row = await db.queryOne<{ verificationCode?: string }>(
          'SELECT "verificationCode" FROM email_verifications WHERE email = $1 ORDER BY "createdAt" DESC LIMIT 1',
          [testUserData.email],
        );
        verifyRes = await authApi.verifyEmail({
          email: testUserData.email,
          code: row!.verificationCode!,
        });
      }
      expect(verifyRes.status()).toBe(200);

      // 3. Login and obtain JWT
      const loginRes = await authApi.login({
        email: testUserData.email,
        password: testUserData.password,
      });
      expect(loginRes.status()).toBe(200);
      const loginData = await loginRes.json();
      const token = loginData.access_token;
      expect(token).toBeDefined();

      // Create authenticated request context and domain API clients for this user
      const authContext = await playwright.request.newContext({
        baseURL: getNormalizedApiBaseUrl(),
        extraHTTPHeaders: { Authorization: `Bearer ${token}` },
      });
      const walletApi = new WalletApi(authContext);
      const benApi = new BeneficiariesApi(authContext);
      const transfersApi = new TransfersApi(authContext);
      const txApi = new TransactionsApi(authContext);

      // 4. Confirm user exists in PostgreSQL
      const dbUser = await db.queryOne<{ id: string; email: string; accountStatus: string }>(
        'SELECT id, email, "accountStatus" FROM users WHERE id = $1',
        [userId],
      );
      expect(dbUser).not.toBeNull();
      expect(dbUser!.email).toBe(testUserData.email);
      expect(dbUser!.accountStatus).toBe('active');

      // 5. Confirm default EUR wallet exists in DB & API
      const dbWallet = await db.queryOne<{ id: string; currency: string; balance: string }>(
        'SELECT id, currency, balance FROM wallets WHERE "userId" = $1 AND "isDefault" = true',
        [userId],
      );
      expect(dbWallet).not.toBeNull();
      expect(dbWallet!.currency).toBe('EUR');
      expect(Number(dbWallet!.balance)).toBe(0);

      const walletApiRes = await walletApi.getMyWallet();
      expect(walletApiRes.status()).toBe(200);
      const apiWallet = await walletApiRes.json();
      expect(apiWallet.id).toBe(dbWallet!.id);
      expect(apiWallet.balance).toBe(0);

      // 6. Fund the wallet with 500 EUR for transfer testing
      await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [500, apiWallet.id]);

      // 7. Create an INR beneficiary via API
      const benPayload = generateBeneficiaryPayload({
        currency: 'INR',
        payoutMethod: 'bank_account',
      });
      const benRes = await benApi.createBeneficiary(benPayload);
      expect(benRes.status()).toBe(201);
      const beneficiary = await benRes.json();
      expect(beneficiary.id).toBeDefined();

      // 8. Confirm beneficiary persistence in PostgreSQL
      const dbBen = await db.queryOne<{ id: string; name: string; currency: string }>(
        'SELECT id, name, currency FROM beneficiaries WHERE id = $1',
        [beneficiary.id],
      );
      expect(dbBen).not.toBeNull();
      expect(dbBen!.name).toBe(benPayload.name);
      expect(dbBen!.currency).toBe('INR');

      // 9. Inspect current applicable exchange rate quote via public API
      const quoteRes = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INR',
        amount: 100,
      });
      expect(quoteRes.status()).toBe(200);
      const quote: ExchangeRateQuoteResponse = await quoteRes.json();
      expect(quote.rate).toBe(89.5);
      expect(quote.convertedAmount).toBe(8950);

      // 10. Execute cross-currency transfer via real Transfers API
      const idempotencyKey = generateIdempotencyKey('success-journey');
      const transferPayload: CreateTransferRequest = {
        sourceWalletId: apiWallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount: 100,
        destinationCurrency: 'INR',
      };
      const transferRes = await transfersApi.createTransfer(transferPayload, idempotencyKey);
      expect(transferRes.status()).toBe(201);
      const transfer: TransferResponse = await transferRes.json();

      // 11. Verify initial API response fields
      expect(transfer.id).toBeDefined();
      expect(transfer.reference).toMatch(/^WP-\d{8}-[A-F0-9]{8}$/);
      expect(transfer.status).toBe('PENDING');
      expect(transfer.sendAmount).toBe(100);
      expect(transfer.fee).toBe(25);
      expect(transfer.recipientAmount).toBe(8950);
      expect(transfer.exchangeRate).toBe(89.5);

      // 12. Verify PostgreSQL transaction persistence, financial fields, and immediate wallet debit
      const dbTx = await db.queryOne<{
        id: string;
        amount: string;
        fee: string;
        exchangeRate: string;
        recipientAmount: string;
      }>('SELECT id, amount, fee, "exchangeRate", "recipientAmount" FROM transactions WHERE id = $1', [
        transfer.id,
      ]);
      expect(dbTx).not.toBeNull();
      expect(Number(dbTx!.amount)).toBe(100);
      expect(Number(dbTx!.fee)).toBe(25);
      expect(Number(dbTx!.exchangeRate)).toBe(89.5);
      expect(Number(dbTx!.recipientAmount)).toBe(8950);

      // Verify wallet balance immediately debited by sendAmount + fee (500 - 125 = 375)
      const postDebitWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [apiWallet.id],
      );
      expect(Number(postDebitWallet!.balance)).toBe(375);

      // Verify Redis idempotency record cached with initial creation response
      const redisKey = `wrightpay:idempotency:transfer:${userId}:${idempotencyKey}`;
      const cachedIdempotency = await redisClient.get(redisKey);
      expect(cachedIdempotency).not.toBeNull();
      const parsedRecord = JSON.parse(cachedIdempotency!);
      expect(parsedRecord.status).toBe('COMPLETED');
      expect(parsedRecord.response.id).toBe(transfer.id);
      expect(parsedRecord.response.status).toBe('PENDING');

      // 13. Wait using bounded polling for asynchronous processing (BullMQ -> Worker)
      const finalTx = await waitForTransactionStatusApi(
        txApi,
        transfer.id,
        'COMPLETED',
      );

      // 14. Verify final transaction state across API and PostgreSQL
      expect(finalTx.status).toBe('COMPLETED');

      const finalDbTx = await db.queryOne<{ status: string; failureReason: string | null }>(
        'SELECT status, "failureReason" FROM transactions WHERE id = $1',
        [transfer.id],
      );
      expect(finalDbTx!.status).toBe('COMPLETED');
      expect(finalDbTx!.failureReason).toBeNull();

      // 15. Verify transaction is present in GET /transactions list
      const listRes = await txApi.getMyTransactions();
      expect(listRes.status()).toBe(200);
      const listData = await listRes.json();
      const matched = listData.items.find((tx: any) => tx.id === transfer.id);
      expect(matched).toBeDefined();
      expect(matched.status).toBe('COMPLETED');

      // 16. Verify final wallet balance invariant holds
      const finalWalletRes = await walletApi.getMyWallet();
      expect(finalWalletRes.status()).toBe(200);
      const finalApiWallet = await finalWalletRes.json();
      expect(finalApiWallet.balance).toBe(375);

      // Financial invariant: initialBalance - (sendAmount + fee) === finalBalance
      expect(500 - (100 + 25)).toBe(finalApiWallet.balance);

      await authContext.dispose();
    });
  });

  // ===========================================================================
  // FLOW 2: Failed Async Transfer & Financial Investigation (WP-QA-001)
  // ===========================================================================
  test.describe('Flow 2: Failed Async Transfer & Financial Settlement (WP-QA-001 Investigation)', () => {
    test('failed settlement transitions to FAILED with failureReason while wallet remains debited without refund', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 500;
      const sendAmount = 100;
      const fee = 25;

      // Setup user with 500 EUR and a beneficiary designed to trigger the backend banking failure simulation
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance, {
        name: 'Simulate Settlement Failure SIMULATE_FAILURE',
        currency: 'EUR',
      });

      const idempotencyKey = generateIdempotencyKey('fail-async');
      const transferRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount,
          destinationCurrency: 'EUR',
        },
        idempotencyKey,
      );
      expect(transferRes.status()).toBe(201);
      const transfer: TransferResponse = await transferRes.json();

      // Initial state is PENDING
      expect(transfer.status).toBe('PENDING');

      // Wallet is debited immediately during synchronous transaction execution
      const postDebitWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(postDebitWallet!.balance)).toBe(initialBalance - (sendAmount + fee));

      // Bounded polling for asynchronous BullMQ worker failure processing
      const failedTx = await waitForTransactionStatusApi(
        authUser.api.transactions,
        transfer.id,
        'FAILED',
        15000,
      );

      // Verify final failure state in API
      expect(failedTx.status).toBe('FAILED');
      expect(failedTx.failureReason).toContain('Simulated banking settlement failure');

      // Verify PostgreSQL transaction row matches API
      const dbTx = await db.queryOne<{ status: string; failureReason: string }>(
        'SELECT status, "failureReason" FROM transactions WHERE id = $1',
        [transfer.id],
      );
      expect(dbTx!.status).toBe('FAILED');
      expect(dbTx!.failureReason).toContain('Simulated banking settlement failure');

      // Crucial Financial Investigation: Check if money was refunded or remains debited
      const postFailureWalletRes = await authUser.api.wallet.getMyWallet();
      expect(postFailureWalletRes.status()).toBe(200);
      const postFailureWallet = await postFailureWalletRes.json();

      const postFailureDbWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );

      // EVIDENCE FOR WP-QA-001:
      // The wallet balance remains at 375 EUR (500 - 125).
      // No refund/compensating transaction was applied when the transfer reached terminal FAILED state.
      expect(postFailureWallet.balance).toBe(375);
      expect(Number(postFailureDbWallet!.balance)).toBe(375);

      // Verify no refund transaction exists for this user
      const refundTxs = await db.query(
        'SELECT id FROM transactions WHERE "userId" = $1 AND amount < 0',
        [authUser.user.id],
      );
      expect(refundTxs.rows.length).toBe(0);
    });
  });

  // ===========================================================================
  // FLOW 3: Idempotency Across Domains (Redis + DB + HTTP Consistency)
  // ===========================================================================
  test.describe('Flow 3: Idempotency Across Domains (Redis, Database, and HTTP Consistency)', () => {
    test('duplicate replay with identical payload returns cached response without duplicate wallet debit or duplicate transaction', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 600;
      const sendAmount = 150;
      const fee = 25;

      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);
      const idempotencyKey = generateIdempotencyKey('replay-test');

      const transferPayload: CreateTransferRequest = {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount,
        destinationCurrency: 'EUR',
      };

      // First Request
      const firstRes = await authUser.api.transfers.createTransfer(transferPayload, idempotencyKey);
      expect(firstRes.status()).toBe(201);
      const firstData: TransferResponse = await firstRes.json();

      // Inspect Redis record
      const redisKey = `wrightpay:idempotency:transfer:${authUser.user.id}:${idempotencyKey}`;
      const rawRedis = await redisClient.get(redisKey);
      expect(rawRedis).not.toBeNull();
      const ttl = await redisClient.ttl(redisKey);
      expect(ttl).toBeGreaterThan(86000); // 24-hour TTL

      // Second Request: Exact Duplicate Replay
      const replayRes = await authUser.api.transfers.createTransfer(transferPayload, idempotencyKey);
      expect(replayRes.status()).toBe(201);
      const replayData: TransferResponse = await replayRes.json();

      // Verify response idempotency (exact same transaction returned)
      expect(replayData.id).toBe(firstData.id);
      expect(replayData.reference).toBe(firstData.reference);

      // Verify exactly ONE transaction row exists in PostgreSQL
      const txRows = await db.query('SELECT id FROM transactions WHERE reference = $1', [
        firstData.reference,
      ]);
      expect(txRows.rows.length).toBe(1);

      // Verify wallet was debited exactly ONCE (600 - 175 = 425, NOT 250)
      const walletDb = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(walletDb!.balance)).toBe(initialBalance - (sendAmount + fee));
    });

    test('reusing same Idempotency-Key with conflicting payload is rejected with 409 Conflict without debiting wallet', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 500);
      const idempotencyKey = generateIdempotencyKey('conflict-test');

      // Initial Transfer
      const firstRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 100,
          destinationCurrency: 'EUR',
        },
        idempotencyKey,
      );
      expect(firstRes.status()).toBe(201);

      // Conflicting Transfer with different sendAmount using identical key
      const conflictRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 200, // Conflict!
          destinationCurrency: 'EUR',
        },
        idempotencyKey,
      );
      expect(conflictRes.status()).toBe(409);
      const conflictBody = await conflictRes.json();
      expect(conflictBody.statusCode).toBe(409);
      expect(conflictBody.message).toContain(
        'Idempotency key was already used with a different request payload',
      );

      // Verify wallet was only debited for the first transfer (500 - 125 = 375, NOT 150)
      const walletDb = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(walletDb!.balance)).toBe(375);

      // Verify user has only 1 transaction created
      const userTxs = await db.query('SELECT id FROM transactions WHERE "userId" = $1', [
        authUser.user.id,
      ]);
      expect(userTxs.rows.length).toBe(1);
    });
  });

  // ===========================================================================
  // FLOW 4: Multi-User Data Isolation & IDOR Guards
  // ===========================================================================
  test.describe('Flow 4: Multi-User Data Isolation & IDOR Guards Across Domains', () => {
    test('enforces strict cross-domain isolation between User A and User B across wallets, beneficiaries, transfers, and transactions', async ({
      playwright,
      authApi,
      authUser,
      db,
    }) => {
      // User A is authUser
      const { wallet: walletA, beneficiary: benA } = await setupFundedUser(authUser, db, 500);

      // Create distinct User B
      const userBData = generateTestUserData();
      const signupB = await authApi.signup(userBData);
      expect(signupB.status()).toBe(201);
      const signupBData = await signupB.json();

      let verifyB = await authApi.verifyEmail({ email: userBData.email, code: '123456' });
      if (!verifyB.ok()) {
        const row = await db.queryOne<{ verificationCode?: string }>(
          'SELECT "verificationCode" FROM email_verifications WHERE email = $1 ORDER BY "createdAt" DESC LIMIT 1',
          [userBData.email],
        );
        verifyB = await authApi.verifyEmail({ email: userBData.email, code: row!.verificationCode! });
      }
      expect(verifyB.status()).toBe(200);

      const loginB = await authApi.login({ email: userBData.email, password: userBData.password });
      const tokenB = (await loginB.json()).access_token;

      const authContextB = await playwright.request.newContext({
        baseURL: getNormalizedApiBaseUrl(),
        extraHTTPHeaders: { Authorization: `Bearer ${tokenB}` },
      });
      const walletApiB = new WalletApi(authContextB);
      const benApiB = new BeneficiariesApi(authContextB);
      const transfersApiB = new TransfersApi(authContextB);
      const txApiB = new TransactionsApi(authContextB);

      // Fetch User B's default wallet
      const walletBRes = await walletApiB.getMyWallet();
      const walletB = await walletBRes.json();
      await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [500, walletB.id]);

      // Create Beneficiary for User B
      const benBRes = await benApiB.createBeneficiary(
        generateBeneficiaryPayload({ name: 'User B Beneficiary' }),
      );
      const benB = await benBRes.json();

      // Create a transfer for User A
      const transferARes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: walletA.id,
          beneficiaryId: benA.id,
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('user-a-tx'),
      );
      expect(transferARes.status()).toBe(201);
      const transferA = await transferARes.json();

      // Cross-Domain IDOR Assertion 1: User B cannot access User A's transaction detail
      const idorTxRes = await txApiB.getTransactionById(transferA.id);
      expect(idorTxRes.status()).toBe(404);

      // Cross-Domain IDOR Assertion 2: User B's transaction list does NOT leak User A's transaction
      const listBRes = await txApiB.getMyTransactions();
      const listB = await listBRes.json();
      expect(listB.items.some((tx: any) => tx.id === transferA.id)).toBe(false);

      // Cross-Domain IDOR Assertion 3: User B cannot execute transfer using User A's wallet
      const idorWalletRes = await transfersApiB.createTransfer(
        {
          sourceWalletId: walletA.id, // User A's wallet!
          beneficiaryId: benB.id,
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('idor-wallet'),
      );
      expect(idorWalletRes.status()).toBe(404);
      expect((await idorWalletRes.json()).message).toContain('Source wallet not found');

      // Cross-Domain IDOR Assertion 4: User B cannot execute transfer using User A's beneficiary
      const idorBenRes = await transfersApiB.createTransfer(
        {
          sourceWalletId: walletB.id,
          beneficiaryId: benA.id, // User A's beneficiary!
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('idor-ben'),
      );
      expect(idorBenRes.status()).toBe(404);
      expect((await idorBenRes.json()).message).toContain('Beneficiary not found');

      // Database verification confirms strict user ownership on records
      const txCheck = await db.queryOne<{ userId: string }>(
        'SELECT "userId" FROM transactions WHERE id = $1',
        [transferA.id],
      );
      expect(txCheck!.userId).toBe(authUser.user.id);
      expect(txCheck!.userId).not.toBe(signupBData.userId);

      await authContextB.dispose();
    });
  });

  // ===========================================================================
  // FLOW 5: Wallet -> Transfer -> Transaction Financial Consistency
  // ===========================================================================
  test.describe('Flow 5: Wallet -> Transfer -> Transaction Consistency', () => {
    test('wallet balance and transaction ledger maintain exact mathematical accounting agreement', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 1000.0;
      const sendAmount = 250.0;
      const fee = 25.0; // WrightPay fixed transfer fee

      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

      const transferRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('fin-consistency'),
      );
      expect(transferRes.status()).toBe(201);
      const transfer = await transferRes.json();

      const expectedRemainingBalance = initialBalance - (sendAmount + fee); // 725.00

      // 1. Verify wallet API balance
      const walletApiRes = await authUser.api.wallet.getMyWallet();
      expect(walletApiRes.status()).toBe(200);
      const apiWallet = await walletApiRes.json();
      expect(apiWallet.balance).toBe(expectedRemainingBalance);

      // 2. Verify wallet DB balance
      const dbWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(dbWallet!.balance)).toBe(expectedRemainingBalance);

      // 3. Verify transaction ledger DB record
      const dbTx = await db.queryOne<{
        amount: string;
        fee: string;
        senderAmount: string;
        recipientAmount: string;
      }>('SELECT amount, fee, "senderAmount", "recipientAmount" FROM transactions WHERE id = $1', [
        transfer.id,
      ]);
      expect(Number(dbTx!.amount)).toBe(sendAmount);
      expect(Number(dbTx!.fee)).toBe(fee);
      expect(Number(dbTx!.senderAmount)).toBe(sendAmount);
      expect(Number(dbTx!.recipientAmount)).toBe(sendAmount);

      // 4. Verify transaction API detail matches ledger
      const txApiRes = await authUser.api.transactions.getTransactionById(transfer.id);
      expect(txApiRes.status()).toBe(200);
      const apiTx = await txApiRes.json();
      expect(apiTx.amount).toBe(sendAmount);
      expect(apiTx.fee).toBe(fee);
    });
  });

  // ===========================================================================
  // FLOW 6: Exchange Rate -> Transfer Consistency
  // ===========================================================================
  test.describe('Flow 6: Exchange Rate -> Transfer Consistency', () => {
    test('transfers pricing engine consumes and records the exact rate and recipient payout calculated by ExchangeRatesService', async ({
      authUser,
      exchangeRatesApi,
      db,
    }) => {
      const sendAmount = 200;

      // 1. Fetch reference quote directly from Exchange Rates API
      const quoteRes = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'USD',
        amount: sendAmount,
      });
      expect(quoteRes.status()).toBe(200);
      const quote: ExchangeRateQuoteResponse = await quoteRes.json();
      expect(quote.rate).toBe(1.08);
      expect(quote.convertedAmount).toBe(216);

      // 2. Setup user and USD beneficiary
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 500, {
        currency: 'USD',
        name: 'USD Recipient FX Test',
      });

      // 3. Execute cross-currency transfer
      const transferRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount,
          destinationCurrency: 'USD',
        },
        generateIdempotencyKey('fx-consistency'),
      );
      expect(transferRes.status()).toBe(201);
      const transfer: TransferResponse = await transferRes.json();

      // 4. Parity checks: Transfer matches Quote
      expect(transfer.exchangeRate).toBe(quote.rate);
      expect(transfer.recipientAmount).toBe(quote.convertedAmount);
      expect(transfer.sendAmount).toBe(quote.amount);

      // 5. Parity checks: Transaction ledger stores identical rate
      const dbTx = await db.queryOne<{ exchangeRate: string; recipientAmount: string }>(
        'SELECT "exchangeRate", "recipientAmount" FROM transactions WHERE id = $1',
        [transfer.id],
      );
      expect(Number(dbTx!.exchangeRate)).toBe(quote.rate);
      expect(Number(dbTx!.recipientAmount)).toBe(quote.convertedAmount);
    });
  });

  // ===========================================================================
  // FLOW 7: Beneficiary -> Transfer Lifecycle Guard
  // ===========================================================================
  test.describe('Flow 7: Beneficiary -> Transfer Lifecycle Guard', () => {
    test('soft-deleted beneficiary is rejected by transfer engine preventing unintended debits', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 500;
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

      // 1. Soft-delete beneficiary via real Beneficiaries API
      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(beneficiary.id);
      expect(deleteRes.status()).toBe(200);

      // 2. Verify soft-delete timestamp in PostgreSQL
      const dbBen = await db.queryOne<{ deletedAt: string | null }>(
        'SELECT "deletedAt" FROM beneficiaries WHERE id = $1',
        [beneficiary.id],
      );
      expect(dbBen).not.toBeNull();
      expect(dbBen!.deletedAt).not.toBeNull();

      // 3. Attempt transfer using the soft-deleted beneficiary
      const transferRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 100,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('soft-del-ben'),
      );

      // Transfer must be rejected with 404 Not Found
      expect(transferRes.status()).toBe(404);
      const body = await transferRes.json();
      expect(body.message).toContain('Beneficiary not found');

      // 4. Financial safety: Wallet was NOT debited
      const postWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(postWallet!.balance)).toBe(initialBalance);

      // 5. No transaction row created in PostgreSQL
      const txCount = await db.queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM transactions WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(txCount!.count)).toBe(0);
    });
  });

  // ===========================================================================
  // FLOW 8: Redis -> Transfer -> Database State Management
  // ===========================================================================
  test.describe('Flow 8: Redis -> Transfer -> Database State Management', () => {
    test('inspects Redis idempotency key format, TTL, request hash, and response caching lifecycle', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 500);
      const idempotencyKey = generateIdempotencyKey('redis-lifecycle');

      const transferRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 75,
          destinationCurrency: 'EUR',
        },
        idempotencyKey,
      );
      expect(transferRes.status()).toBe(201);
      const transfer = await transferRes.json();

      // Inspect Redis key structure
      const expectedKey = `wrightpay:idempotency:transfer:${authUser.user.id}:${idempotencyKey}`;
      const exists = await redisClient.exists(expectedKey);
      expect(exists).toBe(true);

      const ttl = await redisClient.ttl(expectedKey);
      // Configured default TTL is 86400s (24 hours)
      expect(ttl).toBeGreaterThan(86300);
      expect(ttl).toBeLessThanOrEqual(86400);

      const raw = await redisClient.get(expectedKey);
      expect(raw).not.toBeNull();
      const record = JSON.parse(raw!);

      expect(record.status).toBe('COMPLETED');
      expect(typeof record.requestHash).toBe('string');
      expect(record.requestHash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex string
      expect(typeof record.createdAt).toBe('string');
      expect(typeof record.completedAt).toBe('string');
      expect(record.response).toBeDefined();
      expect(record.response.id).toBe(transfer.id);
      expect(record.response.reference).toBe(transfer.reference);
    });
  });

  // ===========================================================================
  // FLOW 9: BullMQ Queue -> Worker Execution -> Durable State
  // ===========================================================================
  test.describe('Flow 9: BullMQ Queue -> Worker Execution -> Durable State', () => {
    test('proves BullMQ job contract and verifies PostgreSQL remains durable source of truth', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 500);
      const idempotencyKey = generateIdempotencyKey('bullmq-durable');

      const transferRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        idempotencyKey,
      );
      expect(transferRes.status()).toBe(201);
      const transfer = await transferRes.json();

      // Verify queue client can inspect the transfers queue
      const isQueueHealthy = await transferQueueClient.healthCheck();
      expect(isQueueHealthy).toBe(true);

      // Wait for BullMQ worker to process the job and transition the transaction to COMPLETED
      const completedTx = await waitForTransactionStatusApi(
        authUser.api.transactions,
        transfer.id,
        'COMPLETED',
      );
      expect(completedTx.status).toBe('COMPLETED');

      // Because removeOnComplete: true is configured, the BullMQ job may be removed from Redis upon success
      // We verify that PostgreSQL retains the complete durable state
      const dbTx = await db.queryOne<{
        id: string;
        reference: string;
        status: string;
        amount: string;
      }>('SELECT id, reference, status, amount FROM transactions WHERE id = $1', [transfer.id]);
      expect(dbTx).not.toBeNull();
      expect(dbTx!.status).toBe('COMPLETED');
      expect(dbTx!.reference).toBe(transfer.reference);
      expect(Number(dbTx!.amount)).toBe(50);
    });
  });

  // ===========================================================================
  // FLOW 10: Pre-Commit Failure / Atomicity
  // ===========================================================================
  test.describe('Flow 10: Pre-Commit Atomicity & Failure Isolation', () => {
    test('insufficient wallet balance triggers atomic rollback: 0 transaction records, 0 wallet mutations, and clean Redis lock', async ({
      authUser,
      db,
    }) => {
      const initialBalance = 50;
      const sendAmount = 100; // Requires 100 + 25 = 125, but wallet has only 50
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

      const idempotencyKey = generateIdempotencyKey('atomic-insufficient');
      const transferRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount,
          destinationCurrency: 'EUR',
        },
        idempotencyKey,
      );

      // Request fails with 400 Bad Request
      expect(transferRes.status()).toBe(400);
      const body = await transferRes.json();
      expect(body.message).toContain('Insufficient wallet balance');

      // 1. Wallet balance is completely unchanged
      const dbWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(dbWallet!.balance)).toBe(initialBalance);

      // 2. Zero transaction rows exist in PostgreSQL
      const txRows = await db.query('SELECT id FROM transactions WHERE "userId" = $1', [
        authUser.user.id,
      ]);
      expect(txRows.rows.length).toBe(0);

      // 3. Redis lock was deleted on rollback so user can retry safely
      const redisKey = `wrightpay:idempotency:transfer:${authUser.user.id}:${idempotencyKey}`;
      const exists = await redisClient.exists(redisKey);
      expect(exists).toBe(false);
    });

    test('suspended user account blocks transfer pre-commit preserving wallet and database state', async ({
      authUser,
      db,
    }) => {
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 500);

      // Suspend user in PostgreSQL
      await db.query('UPDATE users SET "accountStatus" = $1 WHERE id = $2', [
        'suspended',
        authUser.user.id,
      ]);

      const transferRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('atomic-suspended'),
      );

      // Request rejected with 403 Forbidden
      expect(transferRes.status()).toBe(403);
      const body = await transferRes.json();
      expect(body.message).toContain('Account is suspended or closed');

      // Verify wallet was NOT debited
      const dbWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(dbWallet!.balance)).toBe(500);

      // Verify zero transaction rows
      const txRows = await db.query('SELECT id FROM transactions WHERE "userId" = $1', [
        authUser.user.id,
      ]);
      expect(txRows.rows.length).toBe(0);

      // Restore account status for cleanup
      await db.query('UPDATE users SET "accountStatus" = $1 WHERE id = $2', [
        'active',
        authUser.user.id,
      ]);
    });

    test('UPI payout rail currency mismatch blocks transfer pre-commit maintaining wallet integrity', async ({
      authUser,
      db,
    }) => {
      // Create UPI beneficiary
      const { wallet, beneficiary } = await setupFundedUser(authUser, db, 500, {
        payoutMethod: 'upi',
        currency: 'INR',
      });

      // Attempt to send USD to a UPI beneficiary (must be INR)
      const transferRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: 50,
          destinationCurrency: 'USD',
        },
        generateIdempotencyKey('upi-mismatch'),
      );

      expect(transferRes.status()).toBe(400);
      const body = await transferRes.json();
      expect(body.message).toContain('UPI transfers must be in INR');

      // Verify wallet was NOT debited
      const dbWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(dbWallet!.balance)).toBe(500);

      // Verify zero transactions created
      const txRows = await db.query('SELECT id FROM transactions WHERE "userId" = $1', [
        authUser.user.id,
      ]);
      expect(txRows.rows.length).toBe(0);
    });
  });
});

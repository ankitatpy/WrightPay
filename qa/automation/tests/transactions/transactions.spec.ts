import { test, expect, AuthenticatedUserSession } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient, DbClient } from '../../database/db-client';
import { TransactionsApi, TransfersApi, BeneficiariesApi } from '../../api';
import {
  TransactionResponse,
  PaginatedTransactionsResponse,
  CreateTransferRequest,
  TransferResponse,
  CreateBeneficiaryRequest,
} from '../../api/types';

// =========================================================================
// Test Data & Setup Helpers
// =========================================================================

function generateIdempotencyKey(prefix = 'tx-test'): string {
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
 * Provisions a funded wallet, a beneficiary, and executes a transfer to create a canonical transaction.
 */
async function setupUserWithTransfer(
  authUser: AuthenticatedUserSession,
  db: DbClient,
  sendAmount: number = 50.0,
  beneficiaryOverrides?: Partial<CreateBeneficiaryRequest>,
): Promise<{
  wallet: any;
  beneficiary: any;
  transfer: TransferResponse;
}> {
  // 1. Fetch user's default wallet
  const walletRes = await authUser.api.wallet.getMyWallet();
  expect(walletRes.status()).toBe(200);
  const wallet = await walletRes.json();

  // 2. Fund wallet directly in DB (WrightPay has no public deposit endpoint)
  await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [500.0, wallet.id]);

  // 3. Create a beneficiary
  const benRes = await authUser.api.beneficiaries.createBeneficiary(
    generateBeneficiaryPayload(beneficiaryOverrides),
  );
  expect(benRes.status()).toBe(201);
  const beneficiary = await benRes.json();

  // 4. Execute a transfer to generate an authentic transaction ledger entry
  const transferPayload: CreateTransferRequest = {
    sourceWalletId: wallet.id,
    beneficiaryId: beneficiary.id,
    sendAmount,
    destinationCurrency: beneficiary.currency || 'EUR',
  };

  const transferRes = await authUser.api.transfers.createTransfer(
    transferPayload,
    generateIdempotencyKey('setup-tx'),
  );
  expect(transferRes.status()).toBe(201);
  const transfer: TransferResponse = await transferRes.json();

  return { wallet, beneficiary, transfer };
}

/**
 * Bounded polling helper that queries the Transactions API until an expected status is reached.
 */
async function waitForTransactionStatusApi(
  transactionsApi: TransactionsApi,
  transactionId: string,
  targetStatus: string,
  timeoutMs: number = 15000,
  pollIntervalMs: number = 250,
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
  const finalBody = finalRes.status() === 200 ? await finalRes.json() : null;
  throw new Error(
    `Transaction ${transactionId} did not reach status "${targetStatus}" within ${timeoutMs}ms. Current status: ${finalBody?.status}`,
  );
}

// =========================================================================
// Transactions Test Suite
// =========================================================================

test.describe('Transactions Domain API Tests', () => {
  // =======================================================================
  // 1. Authentication & Security
  // =======================================================================
  test.describe('Authentication & Access Control', () => {
    test('rejects GET /transactions when Authorization header is omitted (401 Unauthorized)', async ({
      apiContext,
    }) => {
      const response = await apiContext.get('transactions');
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.message).toBe('Unauthorized');
    });

    test('rejects GET /transactions with invalid or malformed Bearer token (401 Unauthorized)', async ({
      apiContext,
    }) => {
      const response = await apiContext.get('transactions', {
        headers: { Authorization: 'Bearer invalid.or.forged.jwt.token' },
      });
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.message).toBe('Unauthorized');
    });

    test('rejects GET /transactions/:id when Authorization header is omitted (401 Unauthorized)', async ({
      apiContext,
    }) => {
      const response = await apiContext.get('transactions/00000000-0000-0000-0000-000000000000');
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.message).toBe('Unauthorized');
    });

    test('rejects GET /transactions/:id with invalid or malformed Bearer token (401 Unauthorized)', async ({
      apiContext,
    }) => {
      const response = await apiContext.get('transactions/00000000-0000-0000-0000-000000000000', {
        headers: { Authorization: 'Bearer invalid.token' },
      });
      expect(response.status()).toBe(401);
    });
  });

  // =======================================================================
  // 2. User Isolation & Multi-Tenant Security (IDOR)
  // =======================================================================
  test.describe('User Isolation & Multi-Tenant Security (IDOR)', () => {
    test('strictly isolates transaction listings between users: User B sees only their own transactions', async ({
      authUser,
      authApi,
      db,
      playwright,
    }) => {
      // 1. User A generates a transfer
      const { transfer: txA } = await setupUserWithTransfer(authUser, db, 50);

      // 2. Provision User B
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
      const transactionsApiB = new TransactionsApi(userBContext);

      // 3. User B retrieves their transaction list (should be empty, must NOT contain User A's transaction)
      const listResB = await transactionsApiB.getMyTransactions();
      expect(listResB.status()).toBe(200);
      const listDataB: PaginatedTransactionsResponse = await listResB.json();

      expect(listDataB.items).toEqual([]);
      expect(listDataB.total).toBe(0);

      const foundTxAInB = listDataB.items.find((item) => item.id === txA.id);
      expect(foundTxAInB).toBeUndefined();

      await userBContext.dispose();
    });

    test('rejects User B attempting to view User A transaction detail by ID (404 Not Found / IDOR)', async ({
      authUser,
      authApi,
      db,
      playwright,
    }) => {
      // 1. User A creates transaction
      const { transfer: txA } = await setupUserWithTransfer(authUser, db, 60);

      // 2. Provision User B
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
      const transactionsApiB = new TransactionsApi(userBContext);

      // 3. User B attempts IDOR on User A's transaction ID
      const idorRes = await transactionsApiB.getTransactionById(txA.id);
      expect(idorRes.status()).toBe(404);

      const errorBody = await idorRes.json();
      expect(errorBody.message).toContain('Transaction not found');

      // Security Check: Ensure error response does not leak recipient, reference, or amount
      const rawText = await idorRes.text();
      expect(rawText).not.toContain(txA.reference);
      expect(rawText).not.toContain(txA.recipient);

      await userBContext.dispose();
    });
  });

  // =======================================================================
  // 3. Transaction Creation & Read Model Parity
  // =======================================================================
  test.describe('Transaction Creation & Read Model Parity', () => {
    test('retrieves created transfer through GET /transactions/:id and verifies parity with transfer response and PostgreSQL', async ({
      authUser,
      db,
    }) => {
      const sendAmount = 75.0;
      const { transfer } = await setupUserWithTransfer(authUser, db, sendAmount);

      // Fetch transaction detail via Transactions API
      const txRes = await authUser.api.transactions.getTransactionById(transfer.id);
      expect(txRes.status()).toBe(200);
      const txData: TransactionResponse = await txRes.json();

      // Assert parity with originating Transfer API response
      expect(txData.id).toBe(transfer.id);
      expect(txData.reference).toBe(transfer.reference);
      expect(txData.recipient).toBe(transfer.recipient);
      expect(txData.amount).toBe(transfer.sendAmount);
      expect(txData.currency).toBe(transfer.sourceCurrency);
      expect(txData.senderAmount).toBe(transfer.sendAmount);
      expect(txData.senderCurrency).toBe(transfer.sourceCurrency);
      expect(txData.recipientAmount).toBe(transfer.recipientAmount);
      expect(txData.recipientCurrency).toBe(transfer.destinationCurrency);
      expect(txData.fee).toBe(transfer.fee);
      expect(txData.exchangeRate).toBe(transfer.exchangeRate);
      expect(txData.userId).toBe(authUser.user.id);

      // Assert parity with canonical PostgreSQL transaction record
      const dbTx = await db.queryOne<{
        id: string;
        userId: string;
        reference: string;
        amount: string;
        fee: string;
        status: string;
      }>('SELECT * FROM transactions WHERE id = $1', [transfer.id]);

      expect(dbTx).toBeDefined();
      expect(dbTx?.reference).toBe(txData.reference);
      expect(Number(dbTx?.amount)).toBe(txData.amount);
      expect(Number(dbTx?.fee)).toBe(txData.fee);
      expect(dbTx?.userId).toBe(txData.userId);
    });

    test('ensures numeric fields (amount, fee, exchangeRate) are properly cast to JavaScript numbers', async ({
      authUser,
      db,
    }) => {
      const { transfer } = await setupUserWithTransfer(authUser, db, 100);

      const txRes = await authUser.api.transactions.getTransactionById(transfer.id);
      expect(txRes.status()).toBe(200);
      const tx: TransactionResponse = await txRes.json();

      // Verify strict JavaScript primitive types (not stringified decimals)
      expect(typeof tx.amount).toBe('number');
      expect(typeof tx.fee).toBe('number');
      expect(typeof tx.exchangeRate).toBe('number');
      expect(typeof tx.senderAmount).toBe('number');
      expect(typeof tx.recipientAmount).toBe('number');
      expect(Number.isFinite(tx.amount)).toBe(true);
      expect(Number.isFinite(tx.fee)).toBe(true);
    });
  });

  // =======================================================================
  // 4. Single Transaction Detail Retrieval (GET /transactions/:id)
  // =======================================================================
  test.describe('GET /transactions/:id - Detail Retrieval', () => {
    test('returns 200 OK with complete FormattedTransaction contract for valid existing transaction', async ({
      authUser,
      db,
    }) => {
      const { transfer } = await setupUserWithTransfer(authUser, db, 45);

      const response = await authUser.api.transactions.getTransactionById(transfer.id);
      expect(response.status()).toBe(200);
      const data: TransactionResponse = await response.json();

      expect(data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(data.reference).toMatch(/^WP-\d{8}-[A-F0-9]{8}$/);
      expect(data.date).toBeDefined();
      expect(data.createdAt).toBeDefined();
      expect(data.recipient).toBeDefined();
      expect(data.status).toBeDefined();
      expect(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SUSPICIOUS']).toContain(data.status);
    });

    test('returns 404 Not Found when querying a non-existent valid UUID', async ({ authUser }) => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const response = await authUser.api.transactions.getTransactionById(nonExistentUuid);
      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.message).toContain('Transaction not found');
    });

    test('handles malformed non-UUID identifier safely without exposing database credentials', async ({
      authUser,
    }) => {
      const response = await authUser.api.transactions.getTransactionById('not-a-valid-uuid-format');

      // Note: NestJS returns 500 when TypeORM encounters invalid UUID syntax without ParseUUIDPipe
      // We assert safe handling: HTTP status is an error and no sensitive credentials/stack leaked
      expect([400, 404, 500]).toContain(response.status());
      const rawText = await response.text();
      expect(rawText).not.toContain('password');
      expect(rawText).not.toContain('DATABASE_URL');
    });
  });

  // =======================================================================
  // 5. Transaction Listing (GET /transactions) — Pagination & Boundaries
  // =======================================================================
  test.describe('GET /transactions - Pagination & Boundaries', () => {
    test('returns empty items array and total 0 for newly registered user with no transactions', async ({
      authUser,
    }) => {
      const response = await authUser.api.transactions.getMyTransactions();
      expect(response.status()).toBe(200);

      const data: PaginatedTransactionsResponse = await response.json();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBe(0);
      expect(data.total).toBe(0);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);
    });

    test('returns default pagination metadata (limit=20, offset=0) and total count matching user activity', async ({
      authUser,
      db,
    }) => {
      // Create 2 distinct transfers for this user
      await setupUserWithTransfer(authUser, db, 25);
      await setupUserWithTransfer(authUser, db, 35);

      const response = await authUser.api.transactions.getMyTransactions();
      expect(response.status()).toBe(200);

      const data: PaginatedTransactionsResponse = await response.json();
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);
      expect(data.total).toBeGreaterThanOrEqual(2);
      expect(data.items.length).toBeGreaterThanOrEqual(2);
    });

    test('applies custom pagination parameters (limit and offset) correctly slicing items', async ({
      authUser,
      db,
    }) => {
      // Create 2 transfers
      await setupUserWithTransfer(authUser, db, 20);
      await setupUserWithTransfer(authUser, db, 30);

      // Fetch page 1 with limit=1, offset=0
      const page1Res = await authUser.api.transactions.getMyTransactions({ limit: 1, offset: 0 });
      expect(page1Res.status()).toBe(200);
      const page1Data: PaginatedTransactionsResponse = await page1Res.json();
      expect(page1Data.items.length).toBe(1);
      expect(page1Data.limit).toBe(1);
      expect(page1Data.offset).toBe(0);

      // Fetch page 2 with limit=1, offset=1
      const page2Res = await authUser.api.transactions.getMyTransactions({ limit: 1, offset: 1 });
      expect(page2Res.status()).toBe(200);
      const page2Data: PaginatedTransactionsResponse = await page2Res.json();
      expect(page2Data.items.length).toBe(1);
      expect(page2Data.limit).toBe(1);
      expect(page2Data.offset).toBe(1);

      // Assert item on page 1 is distinct from item on page 2
      expect(page1Data.items[0].id).not.toBe(page2Data.items[0].id);
      expect(page1Data.total).toBe(page2Data.total);
    });

    test('accepts boundary pagination values (limit=1, limit=100, offset=0)', async ({
      authUser,
      db,
    }) => {
      await setupUserWithTransfer(authUser, db, 15);

      const minLimitRes = await authUser.api.transactions.getMyTransactions({ limit: 1, offset: 0 });
      expect(minLimitRes.status()).toBe(200);

      const maxLimitRes = await authUser.api.transactions.getMyTransactions({
        limit: 100,
        offset: 0,
      });
      expect(maxLimitRes.status()).toBe(200);
      const maxData = await maxLimitRes.json();
      expect(maxData.limit).toBe(100);
    });

    test('rejects invalid limit=0 or limit=101 with 400 Bad Request', async ({ authUser }) => {
      const resMin = await authUser.api.transactions.getMyTransactions({ limit: 0 });
      expect(resMin.status()).toBe(400);

      const resMax = await authUser.api.transactions.getMyTransactions({ limit: 101 });
      expect(resMax.status()).toBe(400);
    });

    test('rejects negative offset=-1 with 400 Bad Request', async ({ authUser }) => {
      const response = await authUser.api.transactions.getMyTransactions({ offset: -1 });
      expect(response.status()).toBe(400);
    });
  });

  // =======================================================================
  // 6. Transaction Listing (GET /transactions) — Filtering & Search
  // =======================================================================
  test.describe('GET /transactions - Filtering & Search', () => {
    test('filters transactions by lifecycle status', async ({ authUser, db }) => {
      const { transfer } = await setupUserWithTransfer(authUser, db, 40);
      const completedTx = await waitForTransactionStatusApi(
        authUser.api.transactions,
        transfer.id,
        'COMPLETED',
      );

      // Query with status filter matching the terminal status
      const filterRes = await authUser.api.transactions.getMyTransactions({
        status: completedTx.status,
      });
      expect(filterRes.status()).toBe(200);
      const data: PaginatedTransactionsResponse = await filterRes.json();

      expect(data.items.length).toBeGreaterThanOrEqual(1);
      for (const item of data.items) {
        expect(item.status).toBe(completedTx.status);
      }
    });

    test('rejects invalid status enum value with 400 Bad Request', async ({ authUser }) => {
      const response = await authUser.api.transactions.getMyTransactions({
        status: 'INVALID_STATUS_CODE' as any,
      });
      expect(response.status()).toBe(400);
    });

    test('filters transactions by reference substring with case-insensitive search', async ({
      authUser,
      db,
    }) => {
      const { transfer } = await setupUserWithTransfer(authUser, db, 50);

      // Search using middle 8 characters of reference
      const searchSubstring = transfer.reference.slice(3, 11); // e.g. "20260918"
      const res = await authUser.api.transactions.getMyTransactions({
        reference: searchSubstring.toLowerCase(),
      });
      expect(res.status()).toBe(200);

      const data: PaginatedTransactionsResponse = await res.json();
      expect(data.items.length).toBeGreaterThanOrEqual(1);

      const found = data.items.find((tx) => tx.id === transfer.id);
      expect(found).toBeDefined();
      expect(found?.reference).toBe(transfer.reference);
    });

    test('filters transactions by recipient name substring with case-insensitive search', async ({
      authUser,
      db,
    }) => {
      const recipientName = `SearchRecipient_${Date.now()}`;
      const { transfer } = await setupUserWithTransfer(authUser, db, 50, { name: recipientName });

      // Search using a substring of recipient name
      const searchSubstring = recipientName.slice(0, 15).toLowerCase();
      const res = await authUser.api.transactions.getMyTransactions({
        reference: searchSubstring,
      });
      expect(res.status()).toBe(200);

      const data: PaginatedTransactionsResponse = await res.json();
      expect(data.items.length).toBeGreaterThanOrEqual(1);

      const found = data.items.find((tx) => tx.id === transfer.id);
      expect(found).toBeDefined();
      expect(found?.recipient).toContain(recipientName);
    });

    test('supports combined status and reference filters simultaneously', async ({
      authUser,
      db,
    }) => {
      const { transfer } = await setupUserWithTransfer(authUser, db, 60);

      const res = await authUser.api.transactions.getMyTransactions({
        status: transfer.status,
        reference: transfer.reference,
      });
      expect(res.status()).toBe(200);
      const data: PaginatedTransactionsResponse = await res.json();

      expect(data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.items[0].reference).toBe(transfer.reference);
      expect(data.items[0].status).toBe(transfer.status);
    });

    test('returns empty items array when search filter matches no transactions (total=0)', async ({
      authUser,
    }) => {
      const res = await authUser.api.transactions.getMyTransactions({
        reference: 'NON_EXISTENT_REFERENCE_STRING_XYZ_9999',
      });
      expect(res.status()).toBe(200);
      const data: PaginatedTransactionsResponse = await res.json();

      expect(data.items).toEqual([]);
      expect(data.total).toBe(0);
    });
  });

  // =======================================================================
  // 7. Sorting & Chronological Ordering
  // =======================================================================
  test.describe('GET /transactions - Sorting & Ordering', () => {
    test('guarantees deterministic descending chronological order by createdAt (newest first)', async ({
      authUser,
      db,
    }) => {
      // Create 2 sequential transactions
      const { transfer: tx1 } = await setupUserWithTransfer(authUser, db, 20);
      // Small pause to guarantee distinct timestamp
      await new Promise((resolve) => setTimeout(resolve, 50));
      const { transfer: tx2 } = await setupUserWithTransfer(authUser, db, 30);

      const res = await authUser.api.transactions.getMyTransactions({ limit: 10 });
      expect(res.status()).toBe(200);
      const data: PaginatedTransactionsResponse = await res.json();

      expect(data.items.length).toBeGreaterThanOrEqual(2);

      // Verify items are ordered DESC by createdAt timestamp
      for (let i = 0; i < data.items.length - 1; i++) {
        const dateCurrent = new Date(data.items[i].createdAt).getTime();
        const dateNext = new Date(data.items[i + 1].createdAt).getTime();
        expect(dateCurrent).toBeGreaterThanOrEqual(dateNext);
      }

      // Newer transaction (tx2) must appear before older transaction (tx1)
      const indexTx2 = data.items.findIndex((item) => item.id === tx2.id);
      const indexTx1 = data.items.findIndex((item) => item.id === tx1.id);
      expect(indexTx2).toBeLessThan(indexTx1);
    });
  });

  // =======================================================================
  // 8. Asynchronous State Transitions & Eventual Consistency
  // =======================================================================
  test.describe('Asynchronous State Transitions & Eventual Consistency', () => {
    test('reflects asynchronous settlement transition from PENDING to COMPLETED in transaction detail API', async ({
      authUser,
      db,
    }) => {
      const { transfer } = await setupUserWithTransfer(authUser, db, 50);

      // Initial transfer response returned PENDING
      expect(transfer.status).toBe('PENDING');

      // Poll Transactions API until BullMQ worker completes external settlement simulation
      const completedTx = await waitForTransactionStatusApi(
        authUser.api.transactions,
        transfer.id,
        'COMPLETED',
        10000,
      );

      expect(completedTx.status).toBe('COMPLETED');
      expect(completedTx.failureReason).toBeNull();

      // Cross-verify with PostgreSQL canonical record
      const dbRow = await db.queryOne<{ status: string; failureReason: string | null }>(
        'SELECT status, "failureReason" FROM transactions WHERE id = $1',
        [transfer.id],
      );
      expect(dbRow?.status).toBe('COMPLETED');
      expect(dbRow?.failureReason).toBeNull();
    });

    test('reflects asynchronous simulated failure transition from PENDING to FAILED with failureReason', async ({
      authUser,
      db,
    }) => {
      // Beneficiary with SIMULATE_FAILURE triggers banking failure in TransfersProcessor
      const { transfer } = await setupUserWithTransfer(authUser, db, 50, {
        name: 'FailureRecipient SIMULATE_FAILURE',
      });

      // Poll Transactions API until BullMQ exhausts 3 retry attempts and marks FAILED
      const failedTx = await waitForTransactionStatusApi(
        authUser.api.transactions,
        transfer.id,
        'FAILED',
        15000,
      );

      expect(failedTx.status).toBe('FAILED');
      expect(failedTx.failureReason).toContain('Simulated banking settlement failure');

      // Cross-verify with PostgreSQL record
      const dbRow = await db.queryOne<{ status: string; failureReason: string | null }>(
        'SELECT status, "failureReason" FROM transactions WHERE id = $1',
        [transfer.id],
      );
      expect(dbRow?.status).toBe('FAILED');
      expect(dbRow?.failureReason).toContain('Simulated banking settlement failure');
    });
  });

  // =======================================================================
  // 9. Database Validation & Financial Invariants
  // =======================================================================
  test.describe('Database Validation & Financial Invariants', () => {
    test('validates cross-layer database persistence matching PostgreSQL columns directly', async ({
      authUser,
      db,
    }) => {
      const sendAmount = 80.0;
      const { transfer } = await setupUserWithTransfer(authUser, db, sendAmount);

      const apiRes = await authUser.api.transactions.getTransactionById(transfer.id);
      expect(apiRes.status()).toBe(200);
      const apiTx: TransactionResponse = await apiRes.json();

      const dbTx = await db.queryOne<{
        id: string;
        userId: string;
        reference: string;
        recipient: string;
        amount: string;
        fee: string;
        currency: string;
        senderAmount: string;
        senderCurrency: string;
        recipientAmount: string;
        recipientCurrency: string;
        status: string;
      }>('SELECT * FROM transactions WHERE id = $1', [transfer.id]);

      expect(dbTx).toBeDefined();
      expect(dbTx?.id).toBe(apiTx.id);
      expect(dbTx?.userId).toBe(apiTx.userId);
      expect(dbTx?.reference).toBe(apiTx.reference);
      expect(dbTx?.recipient).toBe(apiTx.recipient);
      expect(Number(dbTx?.amount)).toBe(apiTx.amount);
      expect(Number(dbTx?.fee)).toBe(apiTx.fee);
      expect(dbTx?.currency).toBe(apiTx.currency);
      expect(Number(dbTx?.senderAmount)).toBe(apiTx.senderAmount);
      expect(dbTx?.senderCurrency).toBe(apiTx.senderCurrency);
      expect(Number(dbTx?.recipientAmount)).toBe(apiTx.recipientAmount);
      expect(dbTx?.recipientCurrency).toBe(apiTx.recipientCurrency);
    });

    test('proves financial invariant: wallet balance decremented by exact amount + fee recorded in transaction ledger', async ({
      authUser,
      db,
    }) => {
      const startingBalance = 500.0;
      const sendAmount = 120.0;

      // Setup user with known starting balance
      const walletRes = await authUser.api.wallet.getMyWallet();
      const wallet = await walletRes.json();
      await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [startingBalance, wallet.id]);

      const benRes = await authUser.api.beneficiaries.createBeneficiary(
        generateBeneficiaryPayload({ currency: 'EUR' }),
      );
      const beneficiary = await benRes.json();

      const transferRes = await authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('fin-invariant'),
      );
      expect(transferRes.status()).toBe(201);
      const transferData: TransferResponse = await transferRes.json();

      // Retrieve transaction via Transactions API
      const txRes = await authUser.api.transactions.getTransactionById(transferData.id);
      expect(txRes.status()).toBe(200);
      const txData: TransactionResponse = await txRes.json();

      // Verify financial invariant formula:
      // balance_after = balance_before - (tx.amount + tx.fee)
      const postWallet = await db.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      const expectedBalance = startingBalance - (txData.amount + txData.fee); // 500 - (120 + 25) = 355.00
      expect(Number(postWallet?.balance)).toBe(expectedBalance);
    });
  });
});

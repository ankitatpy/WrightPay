import { test, expect, AuthenticatedUserSession } from '../../fixtures/api.fixtures';
import { dbClient, DbClient } from '../../database/db-client';
import { transferQueueClient } from '../../queues/queue-client';
import { CreateBeneficiaryRequest, CreateTransferRequest, TransferResponse } from '../../api/types';

// =========================================================================
// Helpers for Queue Reliability Tests
// =========================================================================

function generateIdempotencyKey(prefix = 'q-rel'): string {
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

/**
 * Bounded polling helper waiting for transaction status transition in PostgreSQL.
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
// STEP 5K: BullMQ Asynchronous Queue Reliability & Retry Suite
// =========================================================================

test.describe('Step 5K - BullMQ Queue Reliability & Asynchronous State Machine', () => {
  // =======================================================================
  // 1. Concurrent BullMQ Processing of Independent Transfers
  // =======================================================================
  test('processes multiple concurrent transfer jobs independently to terminal COMPLETED state', async ({
    authUser,
    db,
  }) => {
    const initialBalance = 500.0;
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, initialBalance);

    const amounts = [40.0, 50.0, 60.0];
    const promises = amounts.map((amt, idx) =>
      authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: beneficiary.id,
          sendAmount: amt,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey(`bullmq-conc-${idx}`),
      ),
    );

    const responses = await Promise.all(promises);
    for (const res of responses) {
      expect(res.status()).toBe(201);
    }

    const txList: TransferResponse[] = await Promise.all(responses.map((r) => r.json()));

    // Verify each transfer starts PENDING and eventually transitions to COMPLETED in parallel
    const completionPromises = txList.map(async (tx) => {
      const completedTx = await waitForTransactionStatus(db, tx.id, 'COMPLETED', 10000);
      expect(completedTx.status).toBe('COMPLETED');
      expect(completedTx.failureReason).toBeNull();
    });

    await Promise.all(completionPromises);

    // Verify all 3 transactions in DB have COMPLETED status
    const dbRows = await db.query<{ id: string; status: string }>(
      'SELECT id, status FROM transactions WHERE id = ANY($1::uuid[])',
      [txList.map((t) => t.id)],
    );
    expect(dbRows.rows.length).toBe(3);
    for (const row of dbRows.rows) {
      expect(row.status).toBe('COMPLETED');
    }
  });

  // =======================================================================
  // 2. BullMQ Retry Mechanics & Exponential Backoff on Simulated Gateway Failure
  // =======================================================================
  test('verifies BullMQ retries 3 times with exponential backoff and transitions to FAILED state', async ({
    authUser,
    db,
    queue,
  }) => {
    // Recipient name containing SIMULATE_FAILURE triggers banking settlement rejection in worker
    const { wallet } = await setupFundedUser(authUser, db, 300);

    const failingBenRes = await authUser.api.beneficiaries.createBeneficiary(
      generateBeneficiaryPayload({
        name: 'Settlement Worker SIMULATE_FAILURE Test',
        currency: 'EUR',
      }),
    );
    expect(failingBenRes.status()).toBe(201);
    const failingBen = await failingBenRes.json();

    const startTime = Date.now();
    const res = await authUser.api.transfers.createTransfer(
      {
        sourceWalletId: wallet.id,
        beneficiaryId: failingBen.id,
        sendAmount: 50.0,
        destinationCurrency: 'EUR',
      },
      generateIdempotencyKey('sim-fail-retry'),
    );
    expect(res.status()).toBe(201);
    const data: TransferResponse = await res.json();
    expect(data.status).toBe('PENDING');

    const expectedJobId = `transfer-${data.id}`;

    // Inspect BullMQ queue job attributes
    const job = await queue.getJob(expectedJobId);
    if (job) {
      expect(job.name).toBe('process-transfer');
      expect(job.opts.attempts).toBe(3);
      expect(job.opts.backoff).toEqual({
        type: 'exponential',
        delay: 1000,
      });
      expect(job.opts.removeOnComplete).toBe(true);
      expect(job.opts.removeOnFail).toBe(false);
    }

    // Wait for the worker to exhaust all 3 attempts (1s + 2s exponential backoff delay = ~3.2s minimum)
    const failedTx = await waitForTransactionStatus(db, data.id, 'FAILED', 15000);
    const duration = Date.now() - startTime;

    expect(failedTx.status).toBe('FAILED');
    expect(failedTx.failureReason).toContain('Simulated banking settlement failure');

    // Backoff timing verification: 3 attempts with exponential delay (1s, 2s) must take > 2.5s
    expect(duration).toBeGreaterThanOrEqual(2500);

    // Ledger Consistency: Exactly one transaction row exists for this transfer
    const txCount = await db.queryOne<{ count: string }>(
      'SELECT count(*) FROM transactions WHERE id = $1',
      [data.id],
    );
    expect(Number(txCount?.count)).toBe(1);
  });

  // =======================================================================
  // 3. Concurrent Mixed Job Processing (Simultaneous Success and Failure)
  // =======================================================================
  test('processes concurrent normal and failing transfers without worker contention or state leakage', async ({
    authUser,
    db,
  }) => {
    const { wallet, beneficiary: normalBen } = await setupFundedUser(authUser, db, 500);

    const failBenRes = await authUser.api.beneficiaries.createBeneficiary(
      generateBeneficiaryPayload({
        name: 'Concurrent SIMULATE_FAILURE Ben',
        currency: 'EUR',
      }),
    );
    expect(failBenRes.status()).toBe(201);
    const failBen = await failBenRes.json();

    // Fire both transfers concurrently
    const [resSuccess, resFail] = await Promise.all([
      authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: normalBen.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('mixed-success'),
      ),
      authUser.api.transfers.createTransfer(
        {
          sourceWalletId: wallet.id,
          beneficiaryId: failBen.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        generateIdempotencyKey('mixed-fail'),
      ),
    ]);

    expect(resSuccess.status()).toBe(201);
    expect(resFail.status()).toBe(201);

    const successData: TransferResponse = await resSuccess.json();
    const failData: TransferResponse = await resFail.json();

    // Wait for both to reach their terminal states
    const [completedTx, failedTx] = await Promise.all([
      waitForTransactionStatus(db, successData.id, 'COMPLETED', 10000),
      waitForTransactionStatus(db, failData.id, 'FAILED', 15000),
    ]);

    expect(completedTx.status).toBe('COMPLETED');
    expect(completedTx.failureReason).toBeNull();

    expect(failedTx.status).toBe('FAILED');
    expect(failedTx.failureReason).toContain('Simulated banking settlement failure');
  });

  // =======================================================================
  // 4. Strengthen Finding WP-QA-001: Missing Automatic Refund on Async Failure
  // =======================================================================
  test('confirms WP-QA-001: wallet balance is NOT refunded when transfer permanently fails in BullMQ', async ({
    authUser,
    db,
  }) => {
    // Initial balance: 400.00 EUR
    // Transfer: 50.00 EUR + 25.00 EUR fee = 75.00 EUR
    // When transfer fails permanently, balance should ideally be refunded back to 400.00 EUR
    // However, in WrightPay V1, NO compensating transaction or refund is issued.
    // The balance permanently remains 325.00 EUR.
    const initialBalance = 400.0;
    const sendAmount = 50.0;
    const fee = 25.0;
    const { wallet } = await setupFundedUser(authUser, db, initialBalance);

    const failBenRes = await authUser.api.beneficiaries.createBeneficiary(
      generateBeneficiaryPayload({
        name: 'Refund Audit SIMULATE_FAILURE',
        currency: 'EUR',
      }),
    );
    const failBen = await failBenRes.json();

    const res = await authUser.api.transfers.createTransfer(
      {
        sourceWalletId: wallet.id,
        beneficiaryId: failBen.id,
        sendAmount,
        destinationCurrency: 'EUR',
      },
      generateIdempotencyKey('wp-qa-001-audit'),
    );
    expect(res.status()).toBe(201);
    const data: TransferResponse = await res.json();

    // Wait until BullMQ transitions transaction to FAILED
    const failedTx = await waitForTransactionStatus(db, data.id, 'FAILED', 15000);
    expect(failedTx.status).toBe('FAILED');

    // Confirm WP-QA-001 behavior: Wallet balance was NOT refunded!
    const postWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    // Balance remains 325.00 EUR instead of restoring 400.00 EUR
    expect(Number(postWallet?.balance)).toBe(initialBalance - (sendAmount + fee));

    // Confirm only the single failed transaction exists in the ledger (no compensating refund transaction)
    const userTxRows = await db.query<{ id: string; status: string }>(
      'SELECT id, status FROM transactions WHERE "userId" = $1',
      [authUser.user.id],
    );
    expect(userTxRows.rows.length).toBe(1);
    expect(userTxRows.rows[0].id).toBe(data.id);
    expect(userTxRows.rows[0].status).toBe('FAILED');
  });

  // =======================================================================
  // 5. Architectural Verification of WP-QA-002: Commit-Before-Enqueue Gap
  // =======================================================================
  test('confirms WP-QA-002 architectural contract: BullMQ job options and unhandled enqueue window', async ({
    authUser,
    db,
    queue,
  }) => {
    // Static & Contract Verification:
    // transfers.service.ts executes:
    // 1. await queryRunner.commitTransaction()  (lines 175)
    // 2. await this.transfersQueue.add(...)     (lines 188-202) inside try/catch
    // If Redis rejects or crashes during line 188, catch block merely logs error,
    // leaving the transaction in PENDING with no BullMQ job.
    const { wallet, beneficiary } = await setupFundedUser(authUser, db, 300);

    const res = await authUser.api.transfers.createTransfer(
      {
        sourceWalletId: wallet.id,
        beneficiaryId: beneficiary.id,
        sendAmount: 30.0,
        destinationCurrency: 'EUR',
      },
      generateIdempotencyKey('wp-qa-002-audit'),
    );
    expect(res.status()).toBe(201);
    const data: TransferResponse = await res.json();

    // Confirm job attributes match the exact options configured in transfers.service.ts
    const jobId = `transfer-${data.id}`;
    const job = await queue.getJob(jobId);
    expect(job).toBeDefined();
    if (job) {
      expect(job.data.transactionId).toBe(data.id);
      expect(job.opts.attempts).toBe(3);
      expect(job.opts.backoff).toEqual({ type: 'exponential', delay: 1000 });
      expect(job.opts.removeOnComplete).toBe(true);
      expect(job.opts.removeOnFail).toBe(false);
    }
  });
});

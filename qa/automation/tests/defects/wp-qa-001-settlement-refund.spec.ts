import { test, expect } from '../../fixtures/api.fixtures';
import { CreateBeneficiaryRequest } from '../../api/types';
import { DbClient } from '../../database/db-client';

function generateBeneficiaryPayload(overrides?: Partial<CreateBeneficiaryRequest>): CreateBeneficiaryRequest {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return {
    name: overrides?.name || `Beneficiary_${unique}`,
    currency: overrides?.currency || 'EUR',
    payoutMethod: overrides?.payoutMethod || 'BANK_ACCOUNT',
    accountNumber: overrides?.accountNumber || `DE8937040044053201${Math.floor(Math.random() * 8999 + 1000)}`,
    bankCode: overrides?.bankCode || 'TESTDEFF',
    ...overrides,
  };
}

/**
 * Bounded polling helper waiting for BullMQ settlement worker to transition transaction in PostgreSQL.
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

test.describe('Defect Regression: WP-QA-001 — Settlement Failure Refund Gap', () => {
  /**
   * FINDING: WP-QA-001
   * TITLE: Missing automatic refund/compensation after asynchronous settlement failure
   * SEVERITY: High
   * CLASSIFICATION: CONFIRMED DEFECT
   *
   * EXPECTED BEHAVIOR:
   * When an asynchronous transfer permanently fails settlement after exhausting worker retries:
   * 1. Transaction status transitions to FAILED with failureReason recorded.
   * 2. The deducted funds (sendAmount + fixed fee) must be automatically credited back to the customer's wallet.
   * 3. A compensating refund transaction or credit ledger entry must be persisted in PostgreSQL for auditability.
   * 4. Compensation must occur exactly once, restoring the wallet balance to its pre-transfer state (400.00 EUR).
   *
   * ACTUAL CURRENT BEHAVIOR:
   * 1. Transaction status transitions to FAILED with failureReason.
   * 2. Customer's wallet balance permanently remains debited at 325.00 EUR (loss of 75.00 EUR).
   * 3. Zero refund or credit records exist in PostgreSQL.
   */
  test('WP-QA-001: failed asynchronous transfer must restore debited wallet balance via compensating refund', async ({
    authUser,
    db,
  }) => {
    test.info().annotations.push(
      { type: 'issue', description: 'WP-QA-001' },
      { type: 'severity', description: 'High' },
      { type: 'classification', description: 'CONFIRMED DEFECT' },
      { type: 'status', description: 'UNRESOLVED' },
      {
        type: 'expected',
        description: 'Wallet balance restored to initial balance (400.00 EUR) and compensating refund record logged',
      },
      {
        type: 'actual',
        description: 'Wallet remains debited at 325.00 EUR with zero compensating refund records in database',
      },
    );

    // Declare expected failure for unresolved defect WP-QA-001
    test.fail(
      true,
      'WP-QA-001: Known unresolved defect — TransfersProcessor does not issue compensating refund on permanent settlement failure',
    );

    // 1. Setup funded wallet with 400.00 EUR
    const initialBalance = 400;
    const sendAmount = 50;
    const fee = 25;
    const totalDeduction = sendAmount + fee; // 75.00 EUR

    const walletRes = await authUser.api.wallet.getMyWallet();
    expect(walletRes.status()).toBe(200);
    const wallet = await walletRes.json();
    await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [initialBalance, wallet.id]);

    // 2. Create beneficiary whose name triggers simulated settlement failure in TransfersProcessor
    const benRes = await authUser.api.beneficiaries.createBeneficiary(
      generateBeneficiaryPayload({
        name: 'Settlement Test SIMULATE_FAILURE',
        currency: 'EUR',
      }),
    );
    expect(benRes.status()).toBe(201);
    const beneficiary = await benRes.json();

    // 3. Initiate transfer
    const idempotencyKey = `wp-qa-001-regress-${Date.now()}`;
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
    const transfer = await transferRes.json();
    expect(transfer.status).toBe('PENDING');

    // 4. Verify synchronous deduction occurred immediately
    const postDebitWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );
    expect(Number(postDebitWallet!.balance)).toBe(initialBalance - totalDeduction); // 325.00 EUR

    // 5. Wait for BullMQ worker to exhaust retries and reach terminal FAILED status
    const terminalTx = await waitForTransactionStatus(db, transfer.id, 'FAILED', 15000);
    expect(terminalTx.status).toBe('FAILED');
    expect(terminalTx.failureReason).toContain('Simulated banking settlement failure');

    // 6. EXPECTED BEHAVIOR ASSERTIONS (Financial Invariant: Failed payout must restore customer funds)
    const finalWalletRes = await authUser.api.wallet.getMyWallet();
    expect(finalWalletRes.status()).toBe(200);
    const finalWallet = await finalWalletRes.json();

    const finalDbWallet = await db.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [wallet.id],
    );

    // This assertion expresses the EXPECTED business invariant:
    // When settlement fails permanently, customer funds must be restored to initial balance (400.00 EUR).
    // Current actual behavior: balance is 325.00 EUR.
    // With test.fail(), this assertion will fail as expected, validating active defect presence without breaking CI.
    expect(Number(finalDbWallet!.balance)).toBe(initialBalance);
    expect(finalWallet.balance).toBe(initialBalance);

    // Assert that a compensating transaction record (e.g. type REFUND or negative fee) exists
    const refundRows = await db.query<{ id: string; status: string }>(
      'SELECT id, status FROM transactions WHERE "sourceWalletId" = $1 AND (status = \'REFUNDED\' OR "failureReason" LIKE \'%refund%\')',
      [wallet.id],
    );
    expect(refundRows.rows.length).toBeGreaterThan(0);
  });
});

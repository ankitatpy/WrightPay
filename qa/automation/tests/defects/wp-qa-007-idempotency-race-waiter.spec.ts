import { test, expect } from '../../fixtures/api.fixtures';
import { CreateBeneficiaryRequest } from '../../api/types';

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

test.describe('Defect Regression: WP-QA-007 — Concurrent Idempotency Waiter Polling Gap', () => {
  /**
   * FINDING: WP-QA-007
   * TITLE: Concurrent idempotency waiters stall and return misleading 409 Conflict after primary request fails early
   * SEVERITY: Low
   * CLASSIFICATION: CONFIRMED IMPLEMENTATION GAP
   *
   * EXPECTED BEHAVIOR:
   * When two concurrent requests share the same idempotency key:
   * 1. If the primary request fails early (e.g. HTTP 400 Insufficient wallet balance) and deletes the lock:
   *    - The concurrent waiter should fail fast (< 1000ms).
   *    - The waiter should NOT return HTTP 409 Conflict claiming the request is "currently processing".
   *    - The waiter should either receive the underlying 400 Bad Request error or promptly abort.
   *
   * ACTUAL CURRENT BEHAVIOR:
   * 1. Primary request fails in ~40ms and deletes the Redis idempotency key.
   * 2. The concurrent waiter polling loop sees key=null, fails to break, and loops for the full
   *    25 iterations (2,500ms delay).
   * 3. At loop exhaustion, IdempotencyService throws ConflictException:
   *    "Transfer request with this idempotency key is currently processing. Please wait."
   * 4. Result: Client experiences a 2.6s stall followed by a false HTTP 409 status.
   */

  test('WP-QA-007: concurrent waiter must not stall for 2.5s or return misleading 409 when primary request fails early', async ({
    authUser,
    db,
  }) => {
    test.info().annotations.push(
      { type: 'issue', description: 'WP-QA-007' },
      { type: 'severity', description: 'Low' },
      { type: 'classification', description: 'CONFIRMED IMPLEMENTATION GAP' },
      { type: 'status', description: 'UNRESOLVED' },
      { type: 'endpoint', description: 'POST /api/v1/transfers' },
      { type: 'expected', description: 'Fast failure (<1000ms) with non-409 error status when primary fails early' },
      { type: 'actual', description: 'Waiter stalls 2.5s and returns misleading 409 Conflict ("currently processing")' },
    );

    test.fail(
      true,
      'WP-QA-007: Known unresolved implementation gap — concurrent poller stalls 2.5s and returns 409 on deleted key',
    );

    // 1. Setup underfunded wallet (10.00 EUR balance)
    const walletRes = await authUser.api.wallet.getMyWallet();
    expect(walletRes.status()).toBe(200);
    const wallet = await walletRes.json();
    await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [10, wallet.id]);

    // 2. Setup beneficiary
    const benRes = await authUser.api.beneficiaries.createBeneficiary(
      generateBeneficiaryPayload({ currency: 'EUR' }),
    );
    expect(benRes.status()).toBe(201);
    const beneficiary = await benRes.json();

    // 3. Prepare payload that will fail balance check: 50.00 EUR + 25.00 EUR fee = 75.00 EUR > 10.00 EUR
    const payload = {
      sourceWalletId: wallet.id,
      beneficiaryId: beneficiary.id,
      sendAmount: 50,
      destinationCurrency: 'EUR' as const,
    };
    const sharedIdempotencyKey = `wp-qa-007-regress-${Date.now()}`;

    // 4. Send two simultaneous requests with the SAME idempotency key
    const startTime = Date.now();
    const [res1, res2] = await Promise.all([
      authUser.api.transfers.createTransfer(payload, sharedIdempotencyKey),
      authUser.api.transfers.createTransfer(payload, sharedIdempotencyKey),
    ]);
    const totalElapsed = Date.now() - startTime;

    const statuses = [res1.status(), res2.status()];

    // Primary request fails fast with 400 Bad Request
    expect(statuses).toContain(400);

    // Identify which response was the waiter
    const waiterRes = res1.status() === 400 ? res2 : res1;

    // EXPECTED BEHAVIOR ASSERTIONS:
    // 1. Waiter must NOT return 409 Conflict claiming the request is "currently processing"
    // (Actual: waiter returns 409 Conflict)
    expect(waiterRes.status()).not.toBe(409);

    // 2. Waiter must fail fast (< 1000ms) rather than stalling for 2500ms
    // (Actual: total elapsed time is ~2600ms)
    expect(totalElapsed).toBeLessThan(1000);
  });
});

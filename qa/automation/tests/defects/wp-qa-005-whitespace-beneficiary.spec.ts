import { test, expect } from '../../fixtures/api.fixtures';

test.describe('Defect Regression: WP-QA-005 — Whitespace Beneficiary Name Acceptance', () => {
  /**
   * FINDING: WP-QA-005
   * TITLE: Whitespace-only beneficiary name can be trimmed to an empty string and persisted
   * SEVERITY: Low
   * CLASSIFICATION: CONFIRMED DEFECT
   *
   * EXPECTED BEHAVIOR:
   * When registering a beneficiary via POST /api/v1/beneficiaries:
   * 1. The name field is mandatory and must not accept whitespace-only strings.
   * 2. The DTO validation pipeline should reject whitespace-only values with HTTP 400 Bad Request
   *    (e.g., via @IsNotEmpty() combined with trimming).
   * 3. No beneficiary record with an empty string name ("") should be persisted in PostgreSQL.
   *
   * ACTUAL CURRENT BEHAVIOR:
   * 1. CreateBeneficiaryDto trims the whitespace to "" but lacks @IsNotEmpty().
   * 2. The endpoint accepts the request and returns HTTP 201 Created with name: "".
   * 3. A beneficiary row with name = "" is persisted to the database.
   */

  test('WP-QA-005: whitespace-only name must be rejected with HTTP 400 Bad Request instead of persisted', async ({
    authUser,
    db,
  }) => {
    test.info().annotations.push(
      { type: 'issue', description: 'WP-QA-005' },
      { type: 'severity', description: 'Low' },
      { type: 'classification', description: 'CONFIRMED DEFECT' },
      { type: 'status', description: 'UNRESOLVED' },
      { type: 'endpoint', description: 'POST /api/v1/beneficiaries' },
      { type: 'expected', description: 'HTTP 400 Bad Request rejecting empty/blank recipient name' },
      { type: 'actual', description: 'HTTP 201 Created with name="" persisted in PostgreSQL' },
    );

    test.fail(
      true,
      'WP-QA-005: Known unresolved defect — whitespace-only name is accepted and persisted as empty string',
    );

    const response = await authUser.api.beneficiaries.createBeneficiary({
      name: '   ',
      currency: 'EUR',
      payoutMethod: 'bank_account' as any,
      accountNumber: 'DE89370400440532013000',
      bankCode: 'TESTDEFF',
    });

    // EXPECTED: HTTP 400 Bad Request
    expect(response.status()).toBe(400);

    // EXPECTED: Zero empty-name beneficiary records in PostgreSQL for this user
    const emptyRow = await db.queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM beneficiaries WHERE "userId" = $1 AND name = \'\'',
      [authUser.user.id],
    );
    expect(emptyRow).toBeNull();
  });

  test('WP-QA-005: tab and newline whitespace name must be rejected with HTTP 400 Bad Request', async ({
    authUser,
  }) => {
    test.info().annotations.push(
      { type: 'issue', description: 'WP-QA-005' },
      { type: 'severity', description: 'Low' },
      { type: 'classification', description: 'CONFIRMED DEFECT' },
      { type: 'status', description: 'UNRESOLVED' },
      { type: 'endpoint', description: 'POST /api/v1/beneficiaries' },
      { type: 'expected', description: 'HTTP 400 Bad Request' },
      { type: 'actual', description: 'HTTP 201 Created with empty string name' },
    );

    test.fail(
      true,
      'WP-QA-005: Known unresolved defect — tabs and newline whitespace are accepted as empty string',
    );

    const response = await authUser.api.beneficiaries.createBeneficiary({
      name: '\t\t\n  ',
      currency: 'EUR',
      payoutMethod: 'bank_account' as any,
      accountNumber: 'DE89370400440532013001',
      bankCode: 'TESTDEFF',
    });

    expect(response.status()).toBe(400);
  });
});

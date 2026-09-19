import { test, expect } from '../../fixtures/api.fixtures';

test.describe('Defect Regression: WP-QA-003 — Malformed UUID HTTP 500 Errors', () => {
  /**
   * FINDING: WP-QA-003
   * TITLE: Malformed UUID path parameters produce HTTP 500 across multiple endpoints
   * SEVERITY: Medium
   * CLASSIFICATION: CONFIRMED DEFECT
   *
   * EXPECTED BEHAVIOR:
   * Endpoints accepting UUID path parameters should validate parameter syntax at the controller
   * boundary (e.g., via NestJS ParseUUIDPipe) and return a controlled client response:
   * - HTTP 400 Bad Request with a clear validation error message, OR
   * - HTTP 404 Not Found.
   * Under no condition should an unhandled database exception (PostgreSQL 22P02) trigger an HTTP 500.
   *
   * ACTUAL CURRENT BEHAVIOR:
   * The unvalidated non-UUID string reaches PostgreSQL, causing error code 22P02:
   * "invalid input syntax for type uuid".
   * This results in an unhandled HTTP 500 Internal Server Error across 6 distinct endpoints.
   */

  const malformedIds = [
    { label: 'alphanumeric non-UUID string', id: 'not-a-valid-uuid' },
    { label: 'integer string', id: '12345' },
    { label: 'SQL-like injection payload', id: "1' OR '1'='1" },
  ];

  for (const { label, id: malformedId } of malformedIds) {
    test(`WP-QA-003: GET /transactions/:id with ${label} must return HTTP 400/404 instead of 500`, async ({
      authUser,
    }) => {
      test.info().annotations.push(
        { type: 'issue', description: 'WP-QA-003' },
        { type: 'severity', description: 'Medium' },
        { type: 'classification', description: 'CONFIRMED DEFECT' },
        { type: 'status', description: 'UNRESOLVED' },
        { type: 'endpoint', description: 'GET /api/v1/transactions/:id' },
        { type: 'expected', description: 'HTTP 400 Bad Request or HTTP 404 Not Found' },
        { type: 'actual', description: 'HTTP 500 Internal Server Error (PostgreSQL 22P02)' },
      );

      test.fail(
        true,
        'WP-QA-003: Known unresolved defect — GET /transactions/:id crashes with HTTP 500 on non-UUID path param',
      );

      const res = await authUser.api.transactions.getTransactionById(malformedId);

      // EXPECTED: Controlled client error (400 Bad Request), NEVER unhandled 500
      expect(res.status()).not.toBe(500);
      expect(res.status()).toBe(400);
    });
  }

  test('WP-QA-003: POST /cards/:id/freeze with malformed UUID must return HTTP 400 instead of 500', async ({
    authUser,
  }) => {
    test.info().annotations.push(
      { type: 'issue', description: 'WP-QA-003' },
      { type: 'severity', description: 'Medium' },
      { type: 'classification', description: 'CONFIRMED DEFECT' },
      { type: 'status', description: 'UNRESOLVED' },
      { type: 'endpoint', description: 'POST /api/v1/cards/:id/freeze' },
      { type: 'expected', description: 'HTTP 400 Bad Request' },
      { type: 'actual', description: 'HTTP 500 Internal Server Error' },
    );

    test.fail(
      true,
      'WP-QA-003: Known unresolved defect — POST /cards/:id/freeze returns HTTP 500 on non-UUID id',
    );

    const res = await authUser.api.cards.freezeCard('not-a-valid-uuid');
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBe(400);
  });

  test('WP-QA-003: DELETE /beneficiaries/:id with malformed UUID must return HTTP 400 instead of 500', async ({
    authUser,
  }) => {
    test.info().annotations.push(
      { type: 'issue', description: 'WP-QA-003' },
      { type: 'severity', description: 'Medium' },
      { type: 'classification', description: 'CONFIRMED DEFECT' },
      { type: 'status', description: 'UNRESOLVED' },
      { type: 'endpoint', description: 'DELETE /api/v1/beneficiaries/:id' },
      { type: 'expected', description: 'HTTP 400 Bad Request' },
      { type: 'actual', description: 'HTTP 500 Internal Server Error' },
    );

    test.fail(
      true,
      'WP-QA-003: Known unresolved defect — DELETE /beneficiaries/:id returns HTTP 500 on non-UUID id',
    );

    const res = await authUser.api.beneficiaries.deleteBeneficiary('not-a-valid-uuid');
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBe(400);
  });
});

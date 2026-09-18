import { test, expect } from '../../fixtures/api.fixtures';

test.describe('Security & Negative-Path Audit - Error Handling & 500 Audit (WP-QA-003 & WP-QA-004)', () => {
  test.describe('Audit of Path Parameters for Unhandled 500 QueryFailedErrors (WP-QA-003 Expansion)', () => {
    test('GET /transactions/:id with malformed non-UUID yields 500 due to unhandled PostgreSQL UUID parsing error', async ({ authUser }) => {
      const response = await authUser.api.transactions.getTransactionById('malformed-non-uuid-string');

      // Defect Evidence for WP-QA-003:
      // The API crashes with 500 Internal Server Error instead of 400 Bad Request
      expect(response.status()).toBe(500);
      const body = await response.json();
      expect(body.statusCode).toBe(500);
      expect(body.message).toMatch(/Internal server error/i);
    });

    test('DELETE /beneficiaries/:id with malformed non-UUID yields 500 due to unhandled PostgreSQL UUID parsing error', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.deleteBeneficiary('malformed-non-uuid-string');

      // Defect Evidence for WP-QA-003 Expansion:
      expect(response.status()).toBe(500);
      const body = await response.json();
      expect(body.statusCode).toBe(500);
    });

    test('POST /cards/:id/freeze with malformed non-UUID yields 500 due to unhandled PostgreSQL UUID parsing error', async ({ authUser }) => {
      const response = await authUser.api.cards.freezeCard('malformed-non-uuid-string');

      // Defect Evidence for WP-QA-003 Expansion:
      expect(response.status()).toBe(500);
      const body = await response.json();
      expect(body.statusCode).toBe(500);
    });

    test('POST /cards/:id/unfreeze with malformed non-UUID yields 500 due to unhandled PostgreSQL UUID parsing error', async ({ authUser }) => {
      const response = await authUser.api.cards.unfreezeCard('malformed-non-uuid-string');

      // Defect Evidence for WP-QA-003 Expansion:
      expect(response.status()).toBe(500);
      const body = await response.json();
      expect(body.statusCode).toBe(500);
    });

    test('POST /cards/:id/deactivate with malformed non-UUID yields 500 due to unhandled PostgreSQL UUID parsing error', async ({ authUser }) => {
      const response = await authUser.api.cards.deactivateCard('malformed-non-uuid-string');

      // Defect Evidence for WP-QA-003 Expansion:
      expect(response.status()).toBe(500);
      const body = await response.json();
      expect(body.statusCode).toBe(500);
    });

    test('DELETE /cards/:id with malformed non-UUID yields 500 due to unhandled PostgreSQL UUID parsing error', async ({ authUser }) => {
      const response = await authUser.api.cards.deleteCard('malformed-non-uuid-string');

      // Defect Evidence for WP-QA-003 Expansion:
      expect(response.status()).toBe(500);
      const body = await response.json();
      expect(body.statusCode).toBe(500);
    });

    test('Contrast: Body DTO with malformed UUID properly returns structured 400 Bad Request', async ({ authUser }) => {
      const wallet = await (await authUser.api.wallet.getMyWallet()).json();

      // Passing non-UUID in DTO body is caught by ValidationPipe + class-validator @IsUUID()
      const response = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: 'malformed-non-uuid-in-dto-body',
          sourceWalletId: wallet.id,
          sendAmount: 10,
          destinationCurrency: 'EUR',
        },
        `sec-audit-contrast-${Date.now()}`,
      );

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.statusCode).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/beneficiaryId must be a UUID/i)]),
      );
    });
  });

  test.describe('Exchange Rates Query Validation & Contract Audit (WP-QA-004 Evidence)', () => {
    test('GET /exchange-rates/quote with invalid destination currency returns controlled 400 Bad Request', async ({ exchangeRatesApi }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INVALID_CURRENCY',
        amount: 100,
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.statusCode).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/to must be one of the following values/i)]),
      );
    });

    test('GET /exchange-rates returns rates serialized as string, confirming contract discrepancy WP-QA-004', async ({ exchangeRatesApi }) => {
      const response = await exchangeRatesApi.getAllRates();
      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);

      const firstRate = body[0];
      // Contract discrepancy evidence: rate is serialized as string in runtime implementation
      expect(typeof firstRate.rate).toBe('string');
      expect(!isNaN(parseFloat(firstRate.rate))).toBe(true);
    });
  });
});

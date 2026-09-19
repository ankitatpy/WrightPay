import { test, expect } from '../../fixtures/api.fixtures';
import { dbClient } from '../../database/db-client';
import { Currency, ExchangeRateResponse, ExchangeRateQuoteResponse } from '../../api/types';

/**
 * Canonical seed exchange rates representing WrightPay reference market data.
 * Base currency is EUR. All other currencies have a direct EUR -> Target rate.
 */
const CANONICAL_SEED_RATES = [
  { from: 'EUR', to: 'USD', rate: 1.08 },
  { from: 'EUR', to: 'GBP', rate: 0.85 },
  { from: 'EUR', to: 'AED', rate: 3.96 },
  { from: 'EUR', to: 'PLN', rate: 4.30 },
  { from: 'EUR', to: 'INR', rate: 89.50 },
];

const ALL_CURRENCIES: Currency[] = ['EUR', 'GBP', 'USD', 'AED', 'PLN', 'INR'];

test.describe('Exchange Rates Domain API Tests', () => {
  // Run tests within this file serially to avoid race conditions on global exchange rates table
  test.describe.configure({ mode: 'serial' });

  // Ensure the database contains the canonical reference exchange rates idempotently
  test.beforeAll(async () => {
    for (const r of CANONICAL_SEED_RATES) {
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

  // =========================================================================
  // 1. Public Access & Authentication Contract
  // =========================================================================
  test.describe('1. Public Access & Authentication Contract', () => {
    test('GET /exchange-rates succeeds without Authorization header as a public endpoint', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getAllRates();
      expect(response.status()).toBe(200);

      const rates = await response.json();
      expect(Array.isArray(rates)).toBe(true);
      expect(rates.length).toBeGreaterThanOrEqual(CANONICAL_SEED_RATES.length);
    });

    test('GET /exchange-rates succeeds with valid Bearer token without rejecting the request', async ({
      authUser,
    }) => {
      const response = await authUser.api.exchangeRates.getAllRates();
      expect(response.status()).toBe(200);

      const rates = await response.json();
      expect(Array.isArray(rates)).toBe(true);
    });

    test('GET /exchange-rates/quote succeeds without Authorization header as a public endpoint', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INR',
        amount: 100,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      expect(quote.from).toBe('EUR');
      expect(quote.to).toBe('INR');
      expect(quote.amount).toBe(100);
    });

    test('GET /exchange-rates/quote succeeds with valid Bearer token', async ({ authUser }) => {
      const response = await authUser.api.exchangeRates.getQuote({
        from: 'EUR',
        to: 'USD',
        amount: 50,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      expect(quote.from).toBe('EUR');
      expect(quote.to).toBe('USD');
      expect(quote.amount).toBe(50);
    });

    test('public exchange-rate endpoints gracefully accept malformed or garbage Authorization headers', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getAllRates(undefined, {
        Authorization: 'Bearer invalid.or.garbage.jwt.token',
      });
      // Controller has no JwtAuthGuard, so unauthenticated and invalid headers are ignored
      expect(response.status()).toBe(200);
    });
  });

  // =========================================================================
  // 2. GET /exchange-rates - List & Schema Contract
  // =========================================================================
  test.describe('2. GET /exchange-rates - List & Schema Contract', () => {
    test('returns 200 OK and validates full response schema for every rate entity', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getAllRates();
      expect(response.status()).toBe(200);

      const rates: ExchangeRateResponse[] = await response.json();
      expect(Array.isArray(rates)).toBe(true);
      expect(rates.length).toBeGreaterThan(0);

      for (const item of rates) {
        expect(typeof item.id).toBe('string');
        expect(item.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
        expect(ALL_CURRENCIES).toContain(item.from);
        expect(ALL_CURRENCIES).toContain(item.to);
        expect(typeof item.timestamp).toBe('string');
        expect(new Date(item.timestamp).toString()).not.toBe('Invalid Date');
        expect(typeof item.createdAt).toBe('string');
        expect(new Date(item.createdAt).toString()).not.toBe('Invalid Date');
      }
    });

    test('documents and verifies PostgreSQL DECIMAL string serialization for rate field', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getAllRates();
      expect(response.status()).toBe(200);

      const rates: ExchangeRateResponse[] = await response.json();
      // In NestJS/TypeORM, PostgreSQL DECIMAL(10,6) is serialized as a numeric string in JSON
      for (const item of rates) {
        expect(typeof item.rate).toBe('string');
        const numericRate = Number(item.rate);
        expect(Number.isFinite(numericRate)).toBe(true);
        expect(numericRate).toBeGreaterThan(0);
      }
    });

    test('verifies response items are deterministically sorted by source currency then destination currency (ASC)', async ({
      exchangeRatesApi,
      db,
    }) => {
      const response = await exchangeRatesApi.getAllRates();
      expect(response.status()).toBe(200);

      const rates: ExchangeRateResponse[] = await response.json();
      const dbRes = await db.query(
        'SELECT id FROM exchange_rates ORDER BY "from" ASC, "to" ASC',
      );
      const expectedIds = dbRes.rows.map((r: any) => r.id);
      const actualIds = rates.map((r: any) => r.id);
      expect(actualIds).toEqual(expectedIds);
    });

    test('ignores unexpected query parameters without failing or altering results', async ({
      exchangeRatesApi,
    }) => {
      const normalRes = await exchangeRatesApi.getAllRates();
      const normalData = await normalRes.json();

      const filteredRes = await exchangeRatesApi.getAllRates({
        page: 1,
        limit: 2,
        sort: 'desc',
        filter: 'unknown',
      });
      expect(filteredRes.status()).toBe(200);
      const filteredData = await filteredRes.json();

      // Controller ignores query params entirely and returns all rates
      expect(filteredData.length).toBe(normalData.length);
    });

    test('does not expose internal server properties or sensitive fields', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getAllRates();
      const rates = await response.json();
      const first = rates[0];

      expect((first as any).password).toBeUndefined();
      expect((first as any).userId).toBeUndefined();
      expect((first as any).deletedAt).toBeUndefined();
      expect((first as any).internalNotes).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. GET /exchange-rates/quote - Calculation Logic & Precision
  // =========================================================================
  test.describe('3. GET /exchange-rates/quote - Calculation Logic & Precision', () => {
    test('same-currency conversion (EUR -> EUR) returns rate 1.0 and exact amount without DB lookup', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'EUR',
        amount: 250.75,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      expect(quote.from).toBe('EUR');
      expect(quote.to).toBe('EUR');
      expect(quote.amount).toBe(250.75);
      expect(quote.rate).toBe(1.0);
      expect(quote.convertedAmount).toBe(250.75);
    });

    test('same-currency conversion for non-EUR currencies (INR -> INR, USD -> USD) returns rate 1.0', async ({
      exchangeRatesApi,
    }) => {
      for (const curr of ['INR', 'USD', 'GBP', 'AED', 'PLN'] as Currency[]) {
        const response = await exchangeRatesApi.getQuote({
          from: curr,
          to: curr,
          amount: 500,
        });
        expect(response.status()).toBe(200);

        const quote: ExchangeRateQuoteResponse = await response.json();
        expect(quote.from).toBe(curr);
        expect(quote.to).toBe(curr);
        expect(quote.rate).toBe(1.0);
        expect(quote.convertedAmount).toBe(500);
      }
    });

    test('direct rate conversion (EUR -> INR) accurately calculates convertedAmount using stored rate', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INR',
        amount: 100,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      expect(quote.from).toBe('EUR');
      expect(quote.to).toBe('INR');
      expect(quote.rate).toBe(89.5);
      expect(quote.amount).toBe(100);
      // 100 * 89.5 = 8950.00
      expect(quote.convertedAmount).toBe(8950);
    });

    test('direct rate conversion (EUR -> USD) calculates convertedAmount with 6-decimal rate precision', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'USD',
        amount: 150,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      expect(quote.rate).toBe(1.08);
      // 150 * 1.08 = 162.00
      expect(quote.convertedAmount).toBe(162);
    });

    test('inverse rate conversion (INR -> EUR) computes 1 / directRate rounded to 6 decimal places', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'INR',
        to: 'EUR',
        amount: 8950,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      expect(quote.from).toBe('INR');
      expect(quote.to).toBe('EUR');
      // 1 / 89.5 = 0.01117318... -> rounded to 6 decimals: 0.011173
      expect(quote.rate).toBe(0.011173);
      // 8950 * 0.011173 = 99.99835 -> rounded to 2 decimals: 100
      expect(quote.convertedAmount).toBe(100);
    });

    test('inverse rate conversion (USD -> EUR) computes 1 / 1.08 = 0.925926', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'USD',
        to: 'EUR',
        amount: 108,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      expect(quote.rate).toBe(0.925926);
      // 108 * 0.925926 = 100.000008 -> 100
      expect(quote.convertedAmount).toBe(100);
    });

    test('triangular conversion via EUR base currency (USD -> INR) calculates (1 / (EUR -> USD)) * (EUR -> INR)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'USD',
        to: 'INR',
        amount: 100,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      // Triangular formula: (1 / 1.08) * 89.5 = 89.5 / 1.08 = 82.87037037... -> 82.87037
      expect(quote.rate).toBe(82.87037);
      // 100 * 82.87037 = 8287.037 -> rounded: 8287.04
      expect(quote.convertedAmount).toBe(8287.04);
    });

    test('triangular conversion computes cross-rate between non-EUR currencies (GBP -> AED)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'GBP',
        to: 'AED',
        amount: 100,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      // Triangular formula: (1 / 0.85) * 3.96 = 3.96 / 0.85 = 4.6588235... -> 4.658824
      expect(quote.rate).toBe(4.658824);
      // 100 * 4.658824 = 465.8824 -> 465.88
      expect(quote.convertedAmount).toBe(465.88);
    });

    test('correctly handles fractional input amounts and applies financial half-up rounding', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'GBP',
        amount: 125.55,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      expect(quote.amount).toBe(125.55);
      // 125.55 * 0.85 = 106.7175 -> rounded to 2 decimals: 106.72
      expect(quote.convertedAmount).toBe(106.72);
    });

    test('minimum allowed amount boundary (0.01) converts correctly without underflow', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INR',
        amount: 0.01,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      expect(quote.amount).toBe(0.01);
      // 0.01 * 89.5 = 0.895 -> rounded: 0.9
      expect(quote.convertedAmount).toBe(0.9);
    });

    test('large financial amounts (1,000,000.00) convert accurately without overflow or precision degradation', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'USD',
        amount: 1_000_000,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      expect(quote.amount).toBe(1000000);
      expect(quote.convertedAmount).toBe(1080000);
    });
  });

  // =========================================================================
  // 4. GET /exchange-rates/quote - Request Validation & Negative Scenarios
  // =========================================================================
  test.describe('4. GET /exchange-rates/quote - Validation & Negative Scenarios', () => {
    test('rejects request with missing "from" query parameter (400 Bad Request)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        to: 'INR',
        amount: 100,
      } as any);
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
      const messages = Array.isArray(body.message) ? body.message : [body.message];
      expect(messages.some((m: string) => m.toLowerCase().includes('from'))).toBe(true);
    });

    test('rejects request with missing "to" query parameter (400 Bad Request)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        amount: 100,
      } as any);
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
      const messages = Array.isArray(body.message) ? body.message : [body.message];
      expect(messages.some((m: string) => m.toLowerCase().includes('to'))).toBe(true);
    });

    test('rejects request with missing "amount" query parameter (400 Bad Request)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INR',
      } as any);
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
      const messages = Array.isArray(body.message) ? body.message : [body.message];
      expect(messages.some((m: string) => m.toLowerCase().includes('amount'))).toBe(true);
    });

    test('rejects request with all query parameters missing (400 Bad Request)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({} as any);
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
    });

    test('rejects request with invalid/unknown source currency code (400 Bad Request)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'XYZ' as any,
        to: 'INR',
        amount: 100,
      });
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
      const messages = Array.isArray(body.message) ? body.message : [body.message];
      expect(messages.some((m: string) => m.includes('from must be one of the following values'))).toBe(true);
    });

    test('rejects request with invalid/unknown destination currency code (400 Bad Request)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'ABC' as any,
        amount: 100,
      });
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
      const messages = Array.isArray(body.message) ? body.message : [body.message];
      expect(messages.some((m: string) => m.includes('to must be one of the following values'))).toBe(true);
    });

    test('rejects lowercase currency codes due to strict enum case sensitivity (400 Bad Request)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'eur' as any,
        to: 'inr' as any,
        amount: 100,
      });
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
    });

    test('rejects non-positive amount of zero (400 Bad Request)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INR',
        amount: 0,
      });
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
      const messages = Array.isArray(body.message) ? body.message : [body.message];
      expect(messages.some((m: string) => m.includes('amount must not be less than 0.01'))).toBe(true);
    });

    test('rejects negative amount (400 Bad Request)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INR',
        amount: -50,
      });
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
      const messages = Array.isArray(body.message) ? body.message : [body.message];
      expect(messages.some((m: string) => m.includes('amount must not be less than 0.01'))).toBe(true);
    });

    test('rejects non-numeric amount string (400 Bad Request)', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INR',
        amount: 'invalid_number' as any,
      });
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
    });

    test('returns 404 Not Found when currency pair has no direct, inverse, or triangular rate in database', async ({
      exchangeRatesApi,
      db,
    }) => {
      // Temporarily delete PLN rates to guarantee no conversion path exists
      await db.query('DELETE FROM exchange_rates WHERE "from"::text = $1 OR "to"::text = $1', ['PLN']);

      try {
        const response = await exchangeRatesApi.getQuote({
          from: 'EUR',
          to: 'PLN',
          amount: 100,
        });
        expect(response.status()).toBe(404);

        const body = await response.json();
        expect(body.statusCode).toBe(404);
        expect(body.message).toContain('Exchange rate not found from EUR to PLN');
      } finally {
        // Restore PLN canonical rate for subsequent tests
        await db.query(
          `INSERT INTO exchange_rates (id, "from", "to", rate, timestamp, "createdAt")
           VALUES (gen_random_uuid(), 'EUR', 'PLN', 4.30, NOW(), NOW())`,
        );
      }
    });
  });

  // =========================================================================
  // 5. Database Consistency & Multi-Tick Historical Selection
  // =========================================================================
  test.describe('5. Database Consistency & Multi-Tick Selection', () => {
    test('verifies GET /exchange-rates data matches persisted PostgreSQL exchange_rates rows exactly', async ({
      exchangeRatesApi,
      db,
    }) => {
      const response = await exchangeRatesApi.getAllRates();
      expect(response.status()).toBe(200);
      const apiRates: ExchangeRateResponse[] = await response.json();

      const dbRes = await db.query(
        'SELECT id, "from", "to", rate, timestamp, "createdAt" FROM exchange_rates ORDER BY "from" ASC, "to" ASC',
      );
      const dbRates = dbRes.rows;

      expect(apiRates.length).toBe(dbRates.length);

      for (let i = 0; i < apiRates.length; i++) {
        const apiItem = apiRates[i];
        const dbItem = dbRates[i];

        expect(apiItem.id).toBe(dbItem.id);
        expect(apiItem.from).toBe(dbItem.from);
        expect(apiItem.to).toBe(dbItem.to);
        // Compare numeric values
        expect(Number(apiItem.rate)).toBeCloseTo(Number(dbItem.rate), 6);
        expect(new Date(apiItem.timestamp).toISOString()).toBe(
          new Date(dbItem.timestamp).toISOString(),
        );
      }
    });

    test('verifies service selects the latest timestamped rate when multiple ticks exist for the same pair', async ({
      exchangeRatesApi,
      db,
    }) => {
      const olderTimestamp = new Date(Date.now() - 3600000); // 1 hour ago
      const newerTimestamp = new Date(); // now

      // Insert an older tick and a newer tick for a dedicated test
      const oldTickId = 'aaaaaaaa-1111-4000-8000-000000000001';
      const newTickId = 'aaaaaaaa-2222-4000-8000-000000000002';

      try {
        await db.query(
          `INSERT INTO exchange_rates (id, "from", "to", rate, timestamp, "createdAt")
           VALUES ($1, 'EUR', 'USD', 1.05, $2, NOW()),
                  ($3, 'EUR', 'USD', 1.12, $4, NOW())`,
          [oldTickId, olderTimestamp, newTickId, newerTimestamp],
        );

        const response = await exchangeRatesApi.getQuote({
          from: 'EUR',
          to: 'USD',
          amount: 100,
        });
        expect(response.status()).toBe(200);

        const quote: ExchangeRateQuoteResponse = await response.json();
        // The service does: order: { timestamp: 'DESC' }, so it must pick 1.12
        expect(quote.rate).toBe(1.12);
        expect(quote.convertedAmount).toBe(112);
      } finally {
        await db.query('DELETE FROM exchange_rates WHERE id IN ($1, $2)', [oldTickId, newTickId]);
      }
    });
  });

  // =========================================================================
  // 6. Cross-Domain Consistency - Payment Engine Integration
  // =========================================================================
  test.describe('6. Cross-Domain Consistency - Payment Engine Integration', () => {
    test('transfers consistency: POST /transfers applies the exact same exchangeRate and recipientAmount as GET /exchange-rates/quote', async ({
      authUser,
      exchangeRatesApi,
      db,
    }) => {
      // 1. Get user's wallet and fund it
      const walletRes = await authUser.api.wallet.getMyWallet();
      expect(walletRes.status()).toBe(200);
      const wallet = await walletRes.json();

      await db.query('UPDATE wallets SET balance = $1 WHERE id = $2', [2000, wallet.id]);

      // 2. Create an INR beneficiary
      const benRes = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Cross Domain Recipient',
        currency: 'INR',
        payoutMethod: 'bank_account',
        accountNumber: '99887766554433',
        bankCode: 'HDFC0001234',
      });
      expect(benRes.status()).toBe(201);
      const beneficiary = await benRes.json();

      const sendAmount = 150;

      // 3. Fetch reference quote from Exchange Rates API
      const quoteRes = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INR',
        amount: sendAmount,
      });
      expect(quoteRes.status()).toBe(200);
      const quote: ExchangeRateQuoteResponse = await quoteRes.json();

      // 4. Execute cross-currency transfer with explicit idempotency key
      const transferRes = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: beneficiary.id,
          sourceWalletId: wallet.id,
          sendAmount,
          destinationCurrency: 'INR',
        },
        `fx-cross-domain-${Date.now()}`,
      );
      expect(transferRes.status()).toBe(201);
      const transfer = await transferRes.json();

      // 5. Cross-domain assertions: Transfer vs Quote
      expect(transfer.exchangeRate).toBe(quote.rate);
      expect(transfer.recipientAmount).toBe(quote.convertedAmount);
      expect(transfer.sendAmount).toBe(quote.amount);

      // 6. Transaction Ledger assertion: Transaction record in DB
      const dbTx = await db.queryOne<{
        exchangeRate: string;
        recipientAmount: string;
        senderAmount: string;
      }>('SELECT "exchangeRate", "recipientAmount", "senderAmount" FROM transactions WHERE id = $1', [
        transfer.id,
      ]);
      expect(dbTx).not.toBeNull();
      expect(Number(dbTx!.exchangeRate)).toBe(quote.rate);
      expect(Number(dbTx!.recipientAmount)).toBe(quote.convertedAmount);
      expect(Number(dbTx!.senderAmount)).toBe(quote.amount);
    });

    test('wallet consistency: GET /wallets/me computed multi-currency equivalents match GET /exchange-rates/quote conversions', async ({
      authUser,
      exchangeRatesApi,
      db,
    }) => {
      const fundedBalance = 1200;
      await db.query('UPDATE wallets SET balance = $1 WHERE "userId" = $2', [
        fundedBalance,
        authUser.user.id,
      ]);

      const walletRes = await authUser.api.wallet.getMyWallet();
      expect(walletRes.status()).toBe(200);
      const wallet = await walletRes.json();
      expect(wallet.balance).toBe(fundedBalance);

      // Verify each supported target currency equivalent
      for (const targetCurrency of ['USD', 'GBP', 'AED', 'INR'] as Currency[]) {
        const quoteRes = await exchangeRatesApi.getQuote({
          from: 'EUR',
          to: targetCurrency,
          amount: fundedBalance,
        });
        expect(quoteRes.status()).toBe(200);
        const quote: ExchangeRateQuoteResponse = await quoteRes.json();

        const walletEquivalent = wallet.equivalents[targetCurrency];
        expect(walletEquivalent).toBeDefined();
        // Wallet service uses: Math.round((numericBalance * rate + Number.EPSILON) * 100) / 100
        // which matches quote.convertedAmount
        expect(walletEquivalent).toBe(quote.convertedAmount);
      }
    });
  });

  // =========================================================================
  // 7. Security & Robustness
  // =========================================================================
  test.describe('7. Security & Robustness', () => {
    test('SQL injection attempt in query parameter is rejected at validation layer without executing SQL', async ({
      exchangeRatesApi,
      db,
    }) => {
      const sqlInjectionPayload = "EUR'; DROP TABLE exchange_rates;--";
      const response = await exchangeRatesApi.getQuote({
        from: sqlInjectionPayload as any,
        to: 'INR',
        amount: 100,
      });
      expect(response.status()).toBe(400);

      // Verify database table was not affected
      const tableCheck = await db.queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM exchange_rates',
      );
      expect(tableCheck).not.toBeNull();
      expect(Number(tableCheck!.count)).toBeGreaterThan(0);
    });

    test('cross-site scripting (XSS) payload in query parameters is rejected with 400 Bad Request', async ({
      exchangeRatesApi,
    }) => {
      const xssPayload = '<script>alert("xss")</script>';
      const response = await exchangeRatesApi.getQuote({
        from: xssPayload as any,
        to: 'USD',
        amount: 100,
      });
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.statusCode).toBe(400);
    });

    test('extremely large numeric amount is handled safely without 500 server crash', async ({
      exchangeRatesApi,
    }) => {
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'USD',
        amount: 999999999999.99,
      });
      // Handled cleanly (200 with converted amount) or rejected (400)
      expect([200, 400]).toContain(response.status());
      expect(response.status()).not.toBe(500);

      if (response.status() === 200) {
        const quote = await response.json();
        expect(Number.isFinite(quote.convertedAmount)).toBe(true);
      }
    });

    test('oversized query string parameter does not crash the service', async ({
      exchangeRatesApi,
    }) => {
      const bufferPayload = 'A'.repeat(5000);
      const response = await exchangeRatesApi.getQuote({
        from: bufferPayload as any,
        to: 'INR',
        amount: 100,
      });
      expect(response.status()).toBe(400);
      expect(response.status()).not.toBe(500);
    });
  });

  // =========================================================================
  // 8. Financial & Mathematical Invariants
  // =========================================================================
  test.describe('8. Financial & Mathematical Invariants', () => {
    test('round-trip conversion (EUR -> INR -> EUR) maintains bounded precision tolerance (<= 0.01)', async ({
      exchangeRatesApi,
    }) => {
      const initialAmount = 100.0; // 100 EUR

      // 1. Convert EUR -> INR
      const fwdRes = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'INR',
        amount: initialAmount,
      });
      expect(fwdRes.status()).toBe(200);
      const fwdQuote: ExchangeRateQuoteResponse = await fwdRes.json();
      const inrAmount = fwdQuote.convertedAmount; // 8950.00 INR

      // 2. Convert INR -> EUR back
      const revRes = await exchangeRatesApi.getQuote({
        from: 'INR',
        to: 'EUR',
        amount: inrAmount,
      });
      expect(revRes.status()).toBe(200);
      const revQuote: ExchangeRateQuoteResponse = await revRes.json();
      const returnedAmount = revQuote.convertedAmount;

      // In financial exchange models with 6-decimal rate rounding:
      // EUR -> INR rate is 89.500000; INR -> EUR rate is 1 / 89.5 = 0.011173.
      // 8950 * 0.011173 = 99.99835 -> 100.00 EUR.
      const difference = Math.abs(returnedAmount - initialAmount);
      expect(difference).toBeLessThanOrEqual(0.01);
    });

    test('quote response is zero-spread identity with no hidden fees embedded in convertedAmount', async ({
      exchangeRatesApi,
    }) => {
      const amount = 345.67;
      const response = await exchangeRatesApi.getQuote({
        from: 'EUR',
        to: 'AED',
        amount,
      });
      expect(response.status()).toBe(200);

      const quote: ExchangeRateQuoteResponse = await response.json();
      const expectedConverted =
        Math.round((amount * quote.rate + Number.EPSILON) * 100) / 100;

      // Proves convertedAmount exactly equals Math.round(amount * rate) with 0 spread/margin
      expect(quote.convertedAmount).toBe(expectedConverted);
    });
  });
});

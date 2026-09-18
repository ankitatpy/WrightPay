import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { WalletApi } from '../../api';

test.describe('Wallet Domain API Tests', () => {
  // ==========================================
  // 1. Authenticated Retrieval & Contract
  // ==========================================
  test.describe('GET /wallets/me - Contract & Schema', () => {
    test('successfully retrieves authenticated wallet with valid schema and zero initial balance', async ({
      authUser,
    }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toBeDefined();

      // Structure and field assertions
      expect(typeof body.id).toBe('string');
      expect(body.id.length).toBeGreaterThan(0);
      expect(body.currency).toBe('EUR');
      expect(typeof body.balance).toBe('number');
      expect(body.balance).toBe(0);
      expect(body.isDefault).toBe(true);
      expect(typeof body.equivalents).toBe('object');
      expect(body.equivalents).not.toBeNull();

      // Sensitive / internal fields should not be exposed
      expect(body.userId).toBeUndefined();
    });

    test('balance representation maintains non-negative finite numeric precision', async ({ authUser }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Number.isFinite(body.balance)).toBe(true);
      expect(body.balance).toBeGreaterThanOrEqual(0);

      // Verify rounding precision (at most 2 decimal places)
      const decimalParts = body.balance.toString().split('.');
      if (decimalParts.length > 1) {
        expect(decimalParts[1].length).toBeLessThanOrEqual(2);
      }
    });
  });

  // ==========================================
  // 2. Database Cross-Layer Validation
  // ==========================================
  test.describe('GET /wallets/me - Database Cross-Layer Validation', () => {
    test('matches persisted PostgreSQL wallet record properties exactly', async ({ authUser }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);
      const apiWallet = await response.json();

      // Query database for the authenticated user's primary wallet
      const dbWallet = await dbClient.queryOne<{
        id: string;
        userId: string;
        currency: string;
        balance: string | number;
        isDefault: boolean;
      }>(
        'SELECT id, "userId", currency, balance, "isDefault" FROM wallets WHERE "userId" = $1',
        [authUser.user.id],
      );

      expect(dbWallet).not.toBeNull();
      expect(dbWallet?.id).toBe(apiWallet.id);
      expect(dbWallet?.userId).toBe(authUser.user.id);
      expect(dbWallet?.currency).toBe(apiWallet.currency);
      expect(Number(dbWallet?.balance)).toBe(apiWallet.balance);
      expect(dbWallet?.isDefault).toBe(apiWallet.isDefault);
    });
  });

  // ==========================================
  // 3. Multi-Currency Equivalents Invariants
  // ==========================================
  test.describe('GET /wallets/me - Currency Equivalents Invariants', () => {
    test('returns calculated equivalent balances for all supported currencies', async ({ authUser }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);
      const body = await response.json();

      // Expected supported currencies confirmed by WalletsService
      const expectedCurrencies = ['EUR', 'GBP', 'USD', 'AED', 'PLN', 'INR'];

      for (const curr of expectedCurrencies) {
        expect(body.equivalents).toHaveProperty(curr);
        expect(typeof body.equivalents[curr]).toBe('number');
        expect(body.equivalents[curr]).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(body.equivalents[curr])).toBe(true);
      }

      // Base currency equivalent must equal current wallet balance
      expect(body.equivalents[body.currency]).toBe(body.balance);
    });
  });

  // ==========================================
  // 4. User Isolation & Read-Only Idempotence
  // ==========================================
  test.describe('GET /wallets/me - User Isolation & Idempotence', () => {
    test('ensures distinct users receive distinct wallets with strict separation', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A from fixture
      const responseA = await authUser.api.wallet.getMyWallet();
      expect(responseA.status()).toBe(200);
      const walletA = await responseA.json();

      // Provision User B
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      const { userId: userIdB } = await signupB.json();

      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({
        email: testUserB.email,
        password: testUserB.password,
      });
      expect(loginB.status()).toBe(200);
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: responseA.url().replace(/\/wallets\/me.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const walletApiB = new WalletApi(contextB);
      const responseB = await walletApiB.getMyWallet();
      expect(responseB.status()).toBe(200);
      const walletB = await responseB.json();

      // Isolation assertions
      expect(walletA.id).not.toBe(walletB.id);

      // Verify in database that ownership maps to distinct users
      const dbWalletA = await dbClient.queryOne<{ userId: string }>('SELECT "userId" FROM wallets WHERE id = $1', [walletA.id]);
      const dbWalletB = await dbClient.queryOne<{ userId: string }>('SELECT "userId" FROM wallets WHERE id = $1', [walletB.id]);

      expect(dbWalletA?.userId).toBe(authUser.user.id);
      expect(dbWalletB?.userId).toBe(userIdB);
      expect(dbWalletA?.userId).not.toBe(dbWalletB?.userId);

      await contextB.dispose();
    });

    test('read operation is strictly idempotent and does not create duplicate wallet records', async ({
      authUser,
    }) => {
      // Check initial wallet count in DB for this user
      const beforeCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM wallets WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(beforeCount?.count)).toBe(1);

      // Perform multiple consecutive GET requests
      const res1 = await authUser.api.wallet.getMyWallet();
      expect(res1.status()).toBe(200);
      const wallet1 = await res1.json();

      const res2 = await authUser.api.wallet.getMyWallet();
      expect(res2.status()).toBe(200);
      const wallet2 = await res2.json();

      // Confirm properties remain identical
      expect(wallet1.id).toBe(wallet2.id);
      expect(wallet1.currency).toBe(wallet2.currency);
      expect(wallet1.balance).toBe(wallet2.balance);

      // Confirm no additional records were created in database
      const afterCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM wallets WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(afterCount?.count)).toBe(1);
    });
  });

  // ==========================================
  // 5. Authorization Negatives
  // ==========================================
  test.describe('GET /wallets/me - Authorization Negatives', () => {
    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('wallets/me');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('wallets/me', {
        headers: {
          Authorization: 'Bearer invalid.token.value',
        },
      });
      expect(response.status()).toBe(401);
    });
  });
});

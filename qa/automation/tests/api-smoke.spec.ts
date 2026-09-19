import { test, expect } from '../fixtures/api.fixtures';

test.describe('API Architecture Smoke Validation', () => {
  test('unauthenticated client can access public exchange-rates endpoint', async ({ exchangeRatesApi }) => {
    const response = await exchangeRatesApi.getAllRates();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('authUser fixture provisions real user and authenticated clients work', async ({ authUser }) => {
    expect(authUser.token).toBeDefined();
    expect(authUser.user.id).toBeDefined();
    expect(authUser.user.email).toContain('@wrightpay-qa.test');

    // Verify authenticated user profile endpoint
    const profileRes = await authUser.api.users.getMe();
    expect(profileRes.status()).toBe(200);
    const profile = await profileRes.json();
    expect(profile.id).toBe(authUser.user.id);
    expect(profile.email).toBe(authUser.user.email);

    // Verify authenticated wallet endpoint
    const walletRes = await authUser.api.wallet.getMyWallet();
    expect(walletRes.status()).toBe(200);
    const wallet = await walletRes.json();
    expect(wallet.id).toBeDefined();
    expect(wallet.currency).toBe('EUR');
    expect(wallet.balance).toBe(0);
    expect(wallet.equivalents).toBeDefined();
  });
});

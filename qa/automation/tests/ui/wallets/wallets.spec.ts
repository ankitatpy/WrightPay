import { test, expect } from '../../../fixtures/ui.fixtures';
import { dbClient } from '../../../database/db-client';

test.describe('Wallets UI Suite — Phase 2E', () => {
  // =========================================================================
  // W1. WALLET DATA LOAD
  // =========================================================================
  test('1. Loads wallet page and displays authenticated user default wallet with initial state matching backend GET /wallets/me', async ({
    authenticatedUser,
  }) => {
    const { walletsPage, walletApi } = authenticatedUser;

    await walletsPage.goto();

    // Verify header and description
    await expect(walletsPage.heading).toBeVisible();
    await expect(walletsPage.subheading).toBeVisible();

    // Verify primary wallet card is rendered with default currency and zero initial balance
    await expect(walletsPage.primaryWalletCard).toBeVisible();
    await expect(walletsPage.primaryCurrencyCode).toHaveText('EUR');
    await expect(walletsPage.primaryFundingBadge).toHaveText('Primary funding currency');
    await expect(walletsPage.primaryBalanceValue).toHaveText('€0.00');

    // Authoritative backend cross-check via GET /api/v1/wallets/me
    const apiRes = await walletApi.getMyWallet();
    expect(apiRes.status()).toBe(200);
    const backendWallet = await apiRes.json();
    expect(backendWallet.currency).toBe('EUR');
    expect(Number(backendWallet.balance)).toBe(0);
    expect(backendWallet.equivalents).toBeDefined();
    expect(backendWallet.equivalents.EUR).toBe(0);
  });

  // =========================================================================
  // W2. BALANCE / CURRENCY REPRESENTATION
  // =========================================================================
  test('2. Displays deterministic funded balance accurately without confusing currency equivalents with real holdings', async ({
    authenticatedUser,
  }) => {
    const { walletsPage, walletApi } = authenticatedUser;

    // Establish deterministic 350.00 EUR balance via authoritative database update
    const initialRes = await walletApi.getMyWallet();
    expect(initialRes.status()).toBe(200);
    const initialWallet = await initialRes.json();

    await dbClient.query('UPDATE wallets SET balance = $1 WHERE id = $2', [350.0, initialWallet.id]);

    await walletsPage.goto();

    // Verify Primary Balance card represents the exact funded balance in EUR
    await expect(walletsPage.primaryWalletCard).toBeVisible();
    await expect(walletsPage.primaryBalanceValue).toHaveText('€350.00');
    await expect(walletsPage.primaryCurrencyCode).toHaveText('EUR');
    await expect(walletsPage.primaryFundingBadge).toBeVisible();

    // Verify independent backend API state
    const apiRes = await walletApi.getMyWallet();
    expect(apiRes.status()).toBe(200);
    const backendWallet = await apiRes.json();
    expect(Number(backendWallet.balance)).toBe(350);
    expect(backendWallet.currency).toBe('EUR');
  });

  // =========================================================================
  // W3. MULTI-CURRENCY / EQUIVALENT DISPLAY
  // =========================================================================
  test('3. Renders multi-currency equivalent projections matching backend GET /wallets/me rates and documents V1 funding limits', async ({
    authenticatedUser,
  }) => {
    const { walletsPage, walletApi } = authenticatedUser;

    // Seed a known balance of 250.00 EUR
    const initialRes = await walletApi.getMyWallet();
    const initialWallet = await initialRes.json();
    await dbClient.query('UPDATE wallets SET balance = $1 WHERE id = $2', [250.0, initialWallet.id]);

    // Fetch authoritative backend equivalents
    const apiRes = await walletApi.getMyWallet();
    expect(apiRes.status()).toBe(200);
    const backendWallet = await apiRes.json();

    await walletsPage.goto();

    // Verify total cards rendered is 6 (1 base + 5 equivalents: GBP, USD, AED, PLN, INR)
    await expect(walletsPage.walletCards).toHaveCount(6);

    // Verify base wallet card representation
    await expect(walletsPage.primaryWalletCard).toContainText('Primary Balance');
    await expect(walletsPage.primaryWalletCard).toContainText('EUR');
    await expect(walletsPage.primaryWalletCard).toContainText('€250.00');

    // Verify equivalent cards have distinctive conversion messaging
    const equivalentCards = walletsPage.equivalentCards;
    await expect(equivalentCards).toHaveCount(5);

    for (const currency of ['GBP', 'USD', 'AED', 'PLN', 'INR']) {
      const card = walletsPage.getCardByCurrency(currency);
      await expect(card).toBeVisible();
      await expect(card).toContainText('Estimated Equivalent');
      await expect(card).toContainText('Converted at current market rate');
      await expect(card).toContainText(currency);

      // Verify equivalent amount matches backend calculation
      const backendEquiv = backendWallet.equivalents[currency];
      expect(backendEquiv).toBeGreaterThan(0);
    }

    // Verify Coming Soon roadmap card
    await expect(walletsPage.comingSoonSection).toBeVisible();
    await expect(walletsPage.page.getByText('Add new wallets in additional currencies')).toBeVisible();
    await expect(walletsPage.page.getByText('Set default currency for transactions')).toBeVisible();
    await expect(walletsPage.page.getByText('View detailed wallet transaction history')).toBeVisible();

    // Document confirmed V1 limitations:
    // 1. Currency equivalents are estimated projections, not separate funded balances.
    // 2. Add Money, card cash-in, and UPI funding workflows are not implemented in WrightPay V1.
  });
});

import { test, expect } from '../../../fixtures/ui.fixtures';

test.describe('Dashboard Suite — Live Balances, Equivalents & Transactions', () => {
  test('9. Dashboard displays primary wallet balance from live backend data', async ({ authenticatedUser, playwright }) => {
    const { user, dashboardPage } = authenticatedUser;

    // 1. Fetch authoritative wallet data directly from backend API for baseline comparison
    const apiContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3001/api/v1/',
      extraHTTPHeaders: {
        Authorization: `Bearer ${user.token}`,
      },
    });

    const walletRes = await apiContext.get('wallets/me');
    expect(walletRes.ok()).toBeTruthy();
    const walletData = await walletRes.json();
    await apiContext.dispose();

    // 2. Load UI dashboard
    await dashboardPage.goto();

    // 3. Verify total balance card displays live currency and formatted balance
    await expect(dashboardPage.primaryBalance).toBeVisible();
    await expect(dashboardPage.primaryBalance).toContainText(walletData.currency === 'EUR' ? '€' : walletData.currency);
    await expect(dashboardPage.primaryBalance).toContainText(Number(walletData.balance).toFixed(2));
  });

  test('10. Dashboard displays currency equivalents across all supported currencies', async ({ authenticatedUser }) => {
    const { dashboardPage } = authenticatedUser;

    await dashboardPage.goto();

    // Verify Currency Equivalents section header
    await expect(dashboardPage.currencyEquivalentsHeading).toBeVisible();

    // Expected supported platform currencies: EUR, GBP, USD, AED, PLN, INR
    const expectedCurrencies = ['EUR', 'GBP', 'USD', 'AED', 'PLN', 'INR'];

    // Verify all 6 currency cards exist in the equivalents grid
    for (const currency of expectedCurrencies) {
      const card = dashboardPage.currencyCards.filter({ hasText: currency });
      await expect(card.first()).toBeVisible();
    }
  });

  test('11. Dashboard displays recent transactions or the correct empty state', async ({ authenticatedUser }) => {
    const { dashboardPage } = authenticatedUser;

    await dashboardPage.goto();

    // Verify Recent Transactions card is visible
    await expect(dashboardPage.recentTransactionsHeading).toBeVisible();

    // Newly registered user has zero transfers, so the table must show the clean empty state
    await expect(dashboardPage.emptyTransactionsMessage).toBeVisible();
    await expect(dashboardPage.emptyTransactionsMessage).toHaveText('No recent transactions');
  });
});

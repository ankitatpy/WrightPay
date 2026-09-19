import { test, expect } from '../../../fixtures/ui.fixtures';

test.describe('Session & Error Handling Suite — Resilience & Interception', () => {
  test('12. Authenticated session survives page reload', async ({ authenticatedUser }) => {
    const { page, user, dashboardPage } = authenticatedUser;

    await dashboardPage.goto();

    // Verify initial authenticated state
    await expect(dashboardPage.headerGreeting).toBeVisible();
    await expect(dashboardPage.headerGreeting).toContainText(user.name);

    // Perform full page reload
    await page.reload();

    // Verify user remained on /dashboard and was not bounced to /login
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardPage.headerGreeting).toBeVisible();
    await expect(dashboardPage.headerGreeting).toContainText(user.name);
    await expect(dashboardPage.primaryBalance).toBeVisible();
  });

  test('13. Simulate backend 401 during session: token is cleared and user is redirected to /login', async ({ page, authenticatedUser, dashboardPage }) => {
    // Intercept profile hydration with an expired / invalid session 401
    await page.route('**/api/v1/users/me', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
      });
    });

    // Navigate to dashboard with simulated 401
    await dashboardPage.goto();

    // Verify route guard intercepted 401, cleared token, and redirected to login
    await expect(page).toHaveURL(/\/login$/);

    const token = await dashboardPage.getStoredToken();
    expect(token).toBeNull();
  });

  test('14. Simulate wallet API failure: user sees error state, Retry action works upon recovery', async ({ page, authenticatedUser, dashboardPage }) => {
    let shouldFail = true;

    // Intercept wallet endpoint to simulate temporary 500 server outage
    await page.route('**/api/v1/wallets/me', (route) => {
      if (shouldFail) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      } else {
        route.continue();
      }
    });

    await dashboardPage.goto();

    // 1. Verify user sees structured error banner with Retry action
    await expect(dashboardPage.walletErrorBanner).toBeVisible();
    await expect(dashboardPage.walletErrorBanner).toContainText('Internal Server Error');
    await expect(dashboardPage.retryButton).toBeVisible();

    // 2. Clear failure condition and trigger Retry action
    shouldFail = false;
    await dashboardPage.retryButton.click();

    // 3. Verify successful recovery and disappearance of error banner
    await expect(dashboardPage.walletErrorBanner).not.toBeVisible();
    await expect(dashboardPage.primaryBalance).toBeVisible();
    await expect(dashboardPage.currencyEquivalentsHeading).toBeVisible();
  });

  test('15. Simulate network failure on secondary dashboard dependency: UI remains stable with graceful fallback', async ({ page, authenticatedUser, dashboardPage }) => {
    // Simulate network connection failure on secondary recent-transactions endpoint
    await page.route('**/api/v1/transactions*', (route) => {
      route.abort('failed');
    });

    await dashboardPage.goto();

    // Verify the primary application shell does not crash
    await expect(dashboardPage.headerGreeting).toBeVisible();
    await expect(dashboardPage.primaryBalance).toBeVisible();
    await expect(dashboardPage.sidebar).toBeVisible();

    // Verify transactions section caught the error gracefully and rendered fallback empty state
    await expect(dashboardPage.recentTransactionsHeading).toBeVisible();
    await expect(dashboardPage.emptyTransactionsMessage).toBeVisible();
  });
});

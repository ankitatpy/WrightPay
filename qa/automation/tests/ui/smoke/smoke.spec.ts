import { test, expect } from '../../../fixtures/ui.fixtures';

test.describe('Smoke Suite — WrightPay Core UI', () => {
  test('1. Landing page loads and primary CTA navigation works', async ({ page, landingPage }) => {
    await landingPage.goto();

    // Verify main marketing hero and branding
    await expect(landingPage.heading).toBeVisible();
    await expect(page.getByText('Why choose WrightPay')).toBeVisible();

    // Verify Sign In CTA navigates to /login
    await landingPage.signInNavButton.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'WrightPay' })).toBeVisible();

    // Navigate back to landing and verify Get Started CTA navigates to /signup
    await landingPage.goto();
    await landingPage.getStartedNavButton.click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole('heading', { level: 1, name: 'WrightPay' })).toBeVisible();
  });

  test('2. Unauthenticated user visiting /dashboard is redirected to /login', async ({ page }) => {
    // Navigate directly to protected route without token
    await page.goto('/dashboard');

    // DashboardLayout route guard must redirect to login
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'WrightPay' })).toBeVisible();

    // Verify localStorage has no active auth token
    const token = await page.evaluate(() => localStorage.getItem('wrightpay_access_token'));
    expect(token).toBeNull();
  });

  test('3. Authenticated user can load /dashboard and sees greeting, balance, and navigation', async ({ authenticatedUser }) => {
    const { page, user, dashboardPage } = authenticatedUser;

    await dashboardPage.goto();

    // Verify greeting and email in header
    await expect(dashboardPage.headerGreeting).toBeVisible();
    await expect(dashboardPage.headerGreeting).toContainText(user.name);
    await expect(dashboardPage.headerEmail).toContainText(user.email);

    // Verify primary balance section
    await expect(page.getByText('Total Available Balance')).toBeVisible();
    await expect(dashboardPage.primaryBalance).toBeVisible();

    // Verify sidebar navigation links
    await expect(dashboardPage.sidebar).toBeVisible();
    await expect(dashboardPage.sidebarOverviewLink).toBeVisible();
    await expect(dashboardPage.sidebarWalletsLink).toBeVisible();
    await expect(dashboardPage.sidebarSendMoneyLink).toBeVisible();
    await expect(dashboardPage.sidebarTransactionsLink).toBeVisible();
    await expect(dashboardPage.sidebarBeneficiariesLink).toBeVisible();
    await expect(dashboardPage.sidebarCardsLink).toBeVisible();
    await expect(dashboardPage.sidebarProfileLink).toBeVisible();
  });
});

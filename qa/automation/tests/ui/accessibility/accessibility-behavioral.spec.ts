import { test, expect } from '../../../fixtures/ui.fixtures';
import { setupFundedUser, generateIdempotencyKey } from '../../../test-data/transfer.factory';

test.describe('Accessibility Behavioral Verifications (Phase 3A)', () => {
  test('Behavioral 1: Keyboard Tab navigation through authentication form controls', async ({
    loginPage,
    page,
  }) => {
    await loginPage.goto();

    // Focus the first form input
    await loginPage.emailInput.focus();
    await expect(loginPage.emailInput).toBeFocused();

    // Tab to password input
    await page.keyboard.press('Tab');
    await expect(loginPage.passwordInput).toBeFocused();

    // Tab to remember me checkbox
    await page.keyboard.press('Tab');
    await expect(loginPage.rememberMeCheckbox).toBeFocused();

    // Tab to Forgot Password link
    await page.keyboard.press('Tab');
    const forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
    await expect(forgotPasswordLink).toBeFocused();

    // Tab to Sign In submit button
    await page.keyboard.press('Tab');
    await expect(loginPage.submitButton).toBeFocused();
  });

  test('Behavioral 2: Keyboard Enter/Space key activation on interactive buttons', async ({
    authenticatedUser,
  }) => {
    const { page, transactionsPage } = authenticatedUser;
    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible();

    // Focus the 'Completed' status filter button
    const completedFilterBtn = page.getByRole('button', { name: 'Completed' });
    await completedFilterBtn.focus();
    await expect(completedFilterBtn).toBeFocused();

    // Activate button using Enter key
    await page.keyboard.press('Enter');
    await expect(completedFilterBtn).toHaveClass(/bg-blue-600/);

    // Focus the 'All' status filter button and activate with Space key
    const allFilterBtn = page.getByRole('button', { name: 'All' });
    await allFilterBtn.focus();
    await expect(allFilterBtn).toBeFocused();
    await page.keyboard.press('Space');
    await expect(allFilterBtn).toHaveClass(/bg-blue-600/);
  });

  test('Behavioral 3: Primary user action buttons define accessible names', async ({
    authenticatedUser,
  }) => {
    const { dashboardPage } = authenticatedUser;
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible();

    // Header sign out button has accessible name
    await expect(dashboardPage.signOutButton).toBeVisible();
    await expect(dashboardPage.signOutButton).toHaveText('Sign out');

    // Sidebar navigation links have clear text accessible names
    await expect(dashboardPage.sidebarOverviewLink).toBeVisible();
    await expect(dashboardPage.sidebarWalletsLink).toBeVisible();
    await expect(dashboardPage.sidebarSendMoneyLink).toBeVisible();
    await expect(dashboardPage.sidebarTransactionsLink).toBeVisible();
    await expect(dashboardPage.sidebarBeneficiariesLink).toBeVisible();
    await expect(dashboardPage.sidebarCardsLink).toBeVisible();
    await expect(dashboardPage.sidebarProfileLink).toBeVisible();
  });

  test('Behavioral 4: Status badges convey status via non-color text labels (WCAG 1.4.1)', async ({
    authenticatedUser,
  }) => {
    const { page, transactionsPage, transfersApi } = authenticatedUser;

    // Seed a funded transfer to generate a real transaction row
    const { wallet, beneficiary } = await setupFundedUser(authenticatedUser, 300, {
      name: 'StatusBadge Recipient',
      currency: 'EUR',
    });

    const idempotencyKey = generateIdempotencyKey('a11y-badge');
    const transferRes = await transfersApi.createTransfer(
      {
        beneficiaryId: beneficiary.id,
        sourceWalletId: wallet.id,
        sendAmount: 50,
        destinationCurrency: 'EUR',
      },
      idempotencyKey,
    );
    expect(transferRes.status()).toBe(201);

    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible();

    // Wait for transaction row to render
    const firstRow = transactionsPage.tableRows.first();
    await expect(firstRow).toBeVisible({ timeout: 5000 });

    // In rows with badges, verify the text content exists and is not purely an icon or color block
    const statusBadge = firstRow.locator('td:nth-child(6) span');
    await expect(statusBadge).toBeVisible();
    const badgeText = await statusBadge.textContent();
    expect(['Completed', 'Pending', 'Failed', 'Processing', 'Suspicious']).toContain(badgeText?.trim());
  });

  test('Behavioral 5: Interactive inputs display perceptible focus indicators', async ({
    loginPage,
  }) => {
    await loginPage.goto();
    await loginPage.emailInput.focus();

    // Verify focus outline / ring styles are applied
    const emailClass = await loginPage.emailInput.getAttribute('class');
    expect(emailClass).toContain('focus:ring-2');
  });
});

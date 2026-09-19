import { test, expect } from '../../../fixtures/ui.fixtures';
import { runAxeScan } from '../../../utils/accessibility.helper';

test.describe('Accessibility Defect Regressions — Confirmed Defects (Phase 3A)', () => {
  /**
   * WP-QA-A11Y-001: Missing Form Label Associations on Profile Form Controls
   * Severity: Critical | WCAG 1.3.1 (A), 4.1.2 (A)
   */
  test('WP-QA-A11Y-001: profile form inputs must have programmatic accessible labels', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-A11Y-001 — known accessibility defect: Profile form inputs lack htmlFor / id associations',
    );

    const { page, profilePage } = authenticatedUser;
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible();

    // Verify accessible names linked via htmlFor / id on Personal Information fields
    const firstNameInput = page.getByRole('textbox', { name: /First Name/i });
    await expect(firstNameInput).toBeVisible({ timeout: 3000 });

    const lastNameInput = page.getByRole('textbox', { name: /Last Name/i });
    await expect(lastNameInput).toBeVisible({ timeout: 3000 });

    const currencySelect = page.getByRole('combobox', { name: /Default Currency/i });
    await expect(currencySelect).toBeVisible({ timeout: 3000 });
  });

  /**
   * WP-QA-A11Y-002: Missing Accessible Names on Select Dropdowns in Add Beneficiary Modal
   * Severity: Critical | WCAG 4.1.2 (A)
   */
  test('WP-QA-A11Y-002: beneficiary modal select dropdowns must have accessible names', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-A11Y-002 — known accessibility defect: Modal select dropdowns lack accessible names',
    );

    const { page, beneficiariesPage } = authenticatedUser;
    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible();
    await beneficiariesPage.openModal();
    await expect(beneficiariesPage.modalHeading).toBeVisible();

    // In a fully accessible modal, selects must be accessible by their label text
    const currencyCombobox = page.getByRole('combobox', { name: /Currency/i });
    await expect(currencyCombobox).toBeVisible({ timeout: 3000 });

    const payoutCombobox = page.getByRole('combobox', { name: /Payout Method/i });
    await expect(payoutCombobox).toBeVisible({ timeout: 3000 });
  });

  /**
   * WP-QA-A11Y-003: Insufficient Color Contrast on Live Rates Banner and Currency Cards
   * Severity: Serious | WCAG 1.4.3 (AA)
   */
  test('WP-QA-A11Y-003: dashboard components must satisfy WCAG AA minimum color contrast ratios', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-A11Y-003 — known accessibility defect: Insufficient color contrast in ExchangeRateBanner and WalletCard',
    );

    const { page, dashboardPage } = authenticatedUser;
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible();

    const { results } = await runAxeScan(page);
    const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');

    // Expect 0 contrast violations
    expect(contrastViolations).toHaveLength(0);
  });

  /**
   * WP-QA-A11Y-004: Missing <main> Landmark and Region Containers on Auth Pages
   * Severity: Moderate | WCAG 1.3.1 (A), 2.4.1 (A)
   */
  test('WP-QA-A11Y-004: login page must contain a semantic <main> landmark', async ({
    loginPage,
    page,
  }) => {
    test.fail(
      true,
      'WP-QA-A11Y-004 — known accessibility defect: Missing main landmark on login page',
    );

    await loginPage.goto();
    const mainLandmark = page.locator('main');
    await expect(mainLandmark).toBeVisible({ timeout: 3000 });
  });

  /**
   * WP-QA-A11Y-005: Broken Heading Hierarchy on Wallets Page
   * Severity: Moderate | WCAG 1.3.1 (A)
   */
  test('WP-QA-A11Y-005: wallets page must not skip heading levels between h1 and h3', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-A11Y-005 — known accessibility defect: Wallets page skips h2 heading level',
    );

    const { page, walletsPage } = authenticatedUser;
    await walletsPage.goto();
    await expect(walletsPage.heading).toBeVisible();

    // Wallets page has h1 "Your Wallets" followed directly by h3 "Coming Soon" without any h2
    const h2Headings = page.locator('main h2');
    await expect(h2Headings.first()).toBeVisible({ timeout: 3000 });
  });

  /**
   * WP-QA-A11Y-006: Missing Modal Dialog Roles, ARIA Attributes, and Accessible Close Names
   * Severity: Serious | WCAG 4.1.2 (A), 1.3.1 (A)
   */
  test('WP-QA-A11Y-006: modal containers must define role="dialog" and accessible close control', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-A11Y-006 — known accessibility defect: Modals lack dialog role, aria-modal, and accessible close button name',
    );

    const { page, beneficiariesPage } = authenticatedUser;
    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible();
    await beneficiariesPage.openModal();
    await expect(beneficiariesPage.modalHeading).toBeVisible();

    // Assert modal container has role="dialog" or is accessible as dialog
    const dialogRole = page.getByRole('dialog');
    await expect(dialogRole).toBeVisible({ timeout: 3000 });

    // Assert close button has an accessible name (not just unlabelled symbol '✕')
    const closeButton = page.getByRole('button', { name: /Close/i });
    await expect(closeButton).toBeVisible({ timeout: 3000 });
  });

  /**
   * WP-QA-A11Y-007: Missing Keyboard Escape-Key Dismissal in Modals
   * Severity: Serious | WCAG 2.1.1 (A), 2.1.2 (A)
   */
  test('WP-QA-A11Y-007: modal dialogs must dismiss when pressing the Escape key', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-A11Y-007 — known accessibility defect: Modal does not close on Escape key',
    );

    const { page, beneficiariesPage } = authenticatedUser;
    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible();
    await beneficiariesPage.openModal();
    await expect(beneficiariesPage.modalHeading).toBeVisible();

    // Press Escape key
    await page.keyboard.press('Escape');

    // Expected: Modal should dismiss and heading should not be visible
    await expect(beneficiariesPage.modalHeading).not.toBeVisible({ timeout: 3000 });
  });

  /**
   * WP-QA-A11Y-008: Data Table Column Headers Lack scope="col" on Transactions
   * Severity: Minor | WCAG 1.3.1 (A)
   */
  test('WP-QA-A11Y-008: transaction table header cells must declare scope="col"', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-A11Y-008 — known accessibility defect: Table headers lack scope="col"',
    );

    const { page, transactionsPage } = authenticatedUser;
    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible();

    const thElements = page.locator('table thead th');
    const count = await thElements.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(thElements.nth(i)).toHaveAttribute('scope', 'col', { timeout: 2000 });
    }
  });

  /**
   * WP-QA-A11Y-009: Sidebar Navigation Active Item Lacks aria-current="page"
   * Severity: Minor | WCAG 1.3.1 (A), 4.1.2 (A)
   */
  test('WP-QA-A11Y-009: active sidebar navigation link must have aria-current="page"', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-A11Y-009 — known accessibility defect: Active sidebar navigation link lacks aria-current="page"',
    );

    const { page, walletsPage } = authenticatedUser;
    await walletsPage.goto();
    await expect(walletsPage.heading).toBeVisible();

    const activeWalletsLink = page.locator('aside nav a[href="/dashboard/wallets"]');
    await expect(activeWalletsLink).toHaveAttribute('aria-current', 'page', { timeout: 2000 });
  });
});

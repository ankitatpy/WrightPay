/**
 * WrightPay Phase 3C — API / Network Error Handling QA
 *
 * Tests use Playwright `page.route()` interception to simulate backend failures
 * without modifying any production code (frontend or backend).
 *
 * Confirmed Defects:
 *   WP-QA-ERR-001  Dashboard: GET /transactions 500 → silently swallowed, renders "No recent transactions"
 *   WP-QA-ERR-002  Send Money: GET /wallets/me 500 → Step 2 shows infinite skeleton, Next disabled, no error message
 *   WP-QA-ERR-003  Send Money: GET /beneficiaries 500 → Step 1 silently renders "No beneficiaries saved yet"
 *   WP-QA-ERR-004  Send Money: Polling GET /transactions/:id 500/network failure → stuck in PENDING spinner, console.error only
 *   WP-QA-ERR-005  Cards: GET /cards 500 → renders empty state "No payment cards saved yet" simultaneously with error banner
 *
 * Observations:
 *   WP-QA-OBS-001  Exchange rates: GET /exchange-rates 500 → banner cleanly hidden (`return null;`), page remains usable
 *   WP-QA-OBS-002  Transactions page: GET /transactions 500 → shows error banner + retry, but table body also renders "No transactions found"
 *   WP-QA-OBS-003  Beneficiaries page: GET /beneficiaries 500 → shows error banner + retry, but also renders empty state and "Add Beneficiary" card
 */

import { test, expect, Page } from '@playwright/test';
import { test as uiTest } from '../../../fixtures/ui.fixtures';
import { dbClient } from '../../../database/db-client';

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const API_BASE = 'http://localhost:3001/api/v1';

/** Respond to an intercepted route with a JSON error payload. */
function mockApiError(
  page: Page,
  urlPattern: string | RegExp,
  status: number,
  message = 'Internal Server Error',
) {
  return page.route(urlPattern, (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ message, statusCode: status }),
    }),
  );
}

/** Abort an intercepted route to simulate a network connection failure. */
function mockNetworkFailure(page: Page, urlPattern: string | RegExp) {
  return page.route(urlPattern, (route) => route.abort('failed'));
}

/** Helper: funds the authenticated user's wallet directly via PostgreSQL. */
async function fundWallet(walletApi: { getMyWallet: () => Promise<any> }, balance = 1000) {
  const walletRes = await walletApi.getMyWallet();
  const wallet = await walletRes.json();
  await dbClient.query('UPDATE wallets SET balance = $1 WHERE id = $2', [balance, wallet.id]);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Authentication Error Handling
// ─────────────────────────────────────────────────────────────────────────────

test.describe('ERR — Authentication', () => {

  /**
   * ERR-AUTH-001 — Login: 401 Unauthorized (invalid credentials)
   * Classification: Acceptable behavior
   * The login page translates INVALID_CREDENTIALS into an inline error message.
   */
  test('ERR-AUTH-001: login with 401 shows a user-facing error message', async ({ page }) => {
    await mockApiError(page, `${API_BASE}/auth/login`, 401, 'INVALID_CREDENTIALS');

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'WrightPay' })).toBeVisible({ timeout: 10000 });

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.getByRole('button', { name: /Sign in/i }).click();

    const errorDiv = page.locator('div.bg-red-50').filter({ hasText: /Incorrect email|credentials|failed/i });
    await expect(errorDiv).toBeVisible({ timeout: 5000 });

    // Form inputs remain preserved and accessible for correction
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
  });

  /**
   * ERR-AUTH-002 — Login: 500 Internal Server Error
   * Classification: Acceptable behavior
   */
  test('ERR-AUTH-002: login with 500 server error shows an error message', async ({ page }) => {
    await mockApiError(page, `${API_BASE}/auth/login`, 500, 'Internal Server Error');

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'WrightPay' })).toBeVisible({ timeout: 10000 });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /Sign in/i }).click();

    const errorDiv = page.locator('div.bg-red-50').filter({ hasText: /error|failed/i });
    await expect(errorDiv).toBeVisible({ timeout: 5000 });

    // Loading state is cleared
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
  });

  /**
   * ERR-AUTH-003 — Login: Network Failure
   * Classification: Acceptable behavior
   */
  test('ERR-AUTH-003: login with network failure shows an error message', async ({ page }) => {
    await mockNetworkFailure(page, `${API_BASE}/auth/login`);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'WrightPay' })).toBeVisible({ timeout: 10000 });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /Sign in/i }).click();

    const errorDiv = page.locator('div.bg-red-50');
    await expect(errorDiv).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  /**
   * ERR-AUTH-004 — Signup: 400 Bad Request (duplicate email or validation error)
   * Classification: Acceptable behavior
   */
  test('ERR-AUTH-004: signup with 400 validation error shows an error message', async ({ page }) => {
    await mockApiError(page, `${API_BASE}/auth/signup`, 400, 'Email already registered');

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'WrightPay' })).toBeVisible({ timeout: 10000 });

    await page.fill('input#firstName', 'Test');
    await page.fill('input#lastName', 'User');
    await page.fill('input#email', 'existing@example.com');
    await page.fill('input#password', 'Password123!');
    await page.fill('input#confirmPassword', 'Password123!');
    const termsCheckbox = page.locator('input#agreeTerms');
    if (await termsCheckbox.count() > 0) {
      await termsCheckbox.check();
    }
    await page.getByRole('button', { name: /Create Account/i }).click();

    const errorEl = page.locator('p.text-red-600').filter({ hasText: /Email already|registered|account|exists/i });
    await expect(errorEl).toBeVisible({ timeout: 5000 });
  });

  /**
   * ERR-AUTH-005 — Email Verification: 400 Bad Request (invalid or expired OTP)
   * Classification: Acceptable behavior
   */
  test('ERR-AUTH-005: verify-email with 400 invalid code shows user-facing error message', async ({ page }) => {
    await mockApiError(page, `${API_BASE}/auth/verify-email`, 400, 'Invalid verification code.');

    // Pre-populate sessionStorage with signup email as required by VerifyEmailPage
    await page.addInitScript(() => {
      window.sessionStorage.setItem('wrightpay_signup_email', 'newuser@example.com');
    });

    await page.goto('/verify-email');
    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible({ timeout: 10000 });

    await page.fill('input#code', '999999');
    await page.getByRole('button', { name: 'Verify email' }).click();

    const errorText = page.locator('p.text-red-600').filter({ hasText: /Invalid|error|verification/i });
    await expect(errorText).toBeVisible({ timeout: 5000 });

    // Verify form input remains present for user to correct the code
    await expect(page.locator('input#code')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verify email' })).toBeEnabled();
  });

  /**
   * ERR-AUTH-006 — GET /users/me: 500 during session restoration
   * Classification: Acceptable behavior (redirects to /login)
   */
  test('ERR-AUTH-006: /users/me 500 during session init redirects user to login', async ({ page }) => {
    await mockApiError(page, `${API_BASE}/users/me`, 500);

    await page.addInitScript(() => {
      window.localStorage.setItem('wrightpay_access_token', 'mock-token-for-500-test');
    });

    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  /**
   * ERR-AUTH-007 — GET /users/me: network failure during session restoration
   * Classification: Acceptable behavior (redirects to /login)
   */
  test('ERR-AUTH-007: /users/me network failure during session init redirects to login', async ({ page }) => {
    await mockNetworkFailure(page, `${API_BASE}/users/me`);

    await page.addInitScript(() => {
      window.localStorage.setItem('wrightpay_access_token', 'mock-token-for-net-test');
    });

    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Dashboard Error Handling
// ─────────────────────────────────────────────────────────────────────────────

uiTest.describe('ERR — Dashboard', () => {

  /**
   * ERR-DASH-001 — Dashboard: GET /transactions 500
   *
   * WP-QA-ERR-001 (CONFIRMED DEFECT)
   *
   * Reproduction:
   * 1. Navigate to /dashboard with GET /transactions intercepted returning 500.
   * 2. UI catch block only logs console.error and clears isLoadingTransactions.
   * 3. Table renders "No recent transactions" — identical to a genuinely empty account.
   * 4. No error alert or retry button is presented to the user.
   */
  uiTest('ERR-DASH-001: /transactions 500 on dashboard silently shows "No recent transactions" (WP-QA-ERR-001)', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-ERR-001 — known defect: Dashboard /transactions 500 is silently swallowed in catch. ' +
      'UI displays "No recent transactions" which is indistinguishable from a legitimate empty state. ' +
      'No user-facing error message or retry action is displayed.',
    );

    const { page, dashboardPage } = authenticatedUser;

    await page.route(`${API_BASE}/transactions*`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error', statusCode: 500 }),
      }),
    );

    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // Actual behavior: "No recent transactions" is displayed
    const emptyMsg = page.getByText('No recent transactions');
    await expect(emptyMsg).toBeVisible({ timeout: 3000 });

    // Expected behavior: an explicit error or retry message should be displayed
    // This assertion FAILS because the error is silently swallowed
    const errorOrRetry = page.locator('[class*="red"]').filter({ hasText: /Failed to load transactions|error/i });
    await expect(errorOrRetry).toBeVisible({ timeout: 3000 });
  });

  /**
   * ERR-DASH-002 — Dashboard: GET /wallets/me 500
   * Classification: Acceptable error banner shown with Retry button
   */
  uiTest('ERR-DASH-002: /wallets/me 500 shows error banner with Retry button on dashboard', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;

    await page.route(`${API_BASE}/wallets/me`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Failed to load wallet data.', statusCode: 500 }),
      }),
    );

    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    await expect(dashboardPage.walletErrorBanner).toBeVisible({ timeout: 5000 });
    await expect(dashboardPage.retryButton).toBeVisible();
  });

  /**
   * ERR-DASH-003 — Dashboard: GET /exchange-rates 500
   * Classification: Informational Observation (WP-QA-OBS-001)
   * The banner silently hides (`return null;`) when rates fail to load.
   * Rest of page remains completely usable.
   */
  uiTest('ERR-DASH-003: exchange-rates 500 silently hides the banner (WP-QA-OBS-001)', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;

    await page.route(`${API_BASE}/exchange-rates*`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error', statusCode: 500 }),
      }),
    );

    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Banner is not rendered in DOM
    const banner = page.locator('text=Live rates');
    await expect(banner).not.toBeVisible();

    // Remainder of page is fully operational
    await expect(page.getByRole('heading', { name: /Currency Equivalents/i })).toBeVisible();
  });

  /**
   * ERR-DASH-004 — Dashboard: GET /wallets/me network failure
   * Classification: Acceptable behavior (error banner + retry displayed)
   */
  uiTest('ERR-DASH-004: /wallets/me network failure shows error banner with Retry', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;

    await page.route(`${API_BASE}/wallets/me`, (route) => route.abort('failed'));

    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    await expect(dashboardPage.walletErrorBanner).toBeVisible({ timeout: 5000 });
    await expect(dashboardPage.retryButton).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Beneficiaries Error Handling
// ─────────────────────────────────────────────────────────────────────────────

uiTest.describe('ERR — Beneficiaries', () => {

  /**
   * ERR-BEN-001 — Beneficiaries: GET /beneficiaries 500
   * Classification: Acceptable error banner shown with Retry button
   */
  uiTest('ERR-BEN-001: GET /beneficiaries 500 shows page-level error banner with Retry', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage } = authenticatedUser;

    await page.route(`${API_BASE}/beneficiaries`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Failed to load beneficiaries', statusCode: 500 }),
      }),
    );

    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  /**
   * ERR-BEN-002 — Beneficiaries: POST /beneficiaries 400 (validation failure)
   * Classification: Acceptable behavior (inline error in modal, modal stays open)
   */
  uiTest('ERR-BEN-002: POST /beneficiaries 400 shows form-level error in modal', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage } = authenticatedUser;

    await page.route(`${API_BASE}/beneficiaries`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid account number format', statusCode: 400 }),
        });
      } else {
        await route.continue();
      }
    });

    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

    await beneficiariesPage.addBeneficiaryButton.click();
    await expect(beneficiariesPage.modal).toBeVisible({ timeout: 5000 });

    await beneficiariesPage.nameInput.fill('John Doe');
    await beneficiariesPage.accountNumberInput.fill('INVALID_ACC');
    await page.getByRole('button', { name: 'Save Beneficiary' }).click();

    const formError = page.locator('[class*="red"]').filter({ hasText: /Invalid|error|failed/i });
    await expect(formError).toBeVisible({ timeout: 5000 });
    await expect(beneficiariesPage.modal).toBeVisible();
  });

  /**
   * ERR-BEN-003 — Beneficiaries: POST /beneficiaries 409 (capacity limit reached)
   * Classification: Acceptable behavior
   */
  uiTest('ERR-BEN-003: POST /beneficiaries 409 shows conflict error in modal', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage } = authenticatedUser;

    await page.route(`${API_BASE}/beneficiaries`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Maximum beneficiary limit reached', statusCode: 409 }),
        });
      } else {
        await route.continue();
      }
    });

    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

    await beneficiariesPage.addBeneficiaryButton.click();
    await expect(beneficiariesPage.modal).toBeVisible({ timeout: 5000 });

    await beneficiariesPage.nameInput.fill('Capacity User');
    await beneficiariesPage.accountNumberInput.fill('DE89370400440532013000');
    await page.getByRole('button', { name: 'Save Beneficiary' }).click();

    const formError = page.locator('[class*="red"]').filter({ hasText: /limit|conflict|Maximum/i });
    await expect(formError).toBeVisible({ timeout: 5000 });
  });

  /**
   * ERR-BEN-004 — Beneficiaries: DELETE /beneficiaries/:id 500
   * Classification: Acceptable behavior (page-level error banner, record preserved)
   */
  uiTest('ERR-BEN-004: DELETE /beneficiaries 500 shows page-level error and preserves beneficiary', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage, beneficiariesApi } = authenticatedUser;

    await beneficiariesApi.createBeneficiary({
      name: 'Delete 500 Test',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'DE89370400440532013000',
      bankCode: 'DEUTDEDD',
    });

    await page.route(`${API_BASE}/beneficiaries/**`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Failed to delete beneficiary', statusCode: 500 }),
        });
      } else {
        await route.continue();
      }
    });

    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

    const removeBtn = page.getByRole('button', { name: 'Remove' }).first();
    await expect(removeBtn).toBeVisible({ timeout: 5000 });
    await removeBtn.click();

    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    await expect(beneficiariesPage.getCardByName('Delete 500 Test')).toBeVisible();
  });

  /**
   * ERR-BEN-005 — Beneficiaries: DELETE /beneficiaries/:id 404 (not found / already deleted)
   * Classification: Acceptable behavior
   */
  uiTest('ERR-BEN-005: DELETE /beneficiaries 404 shows error banner and handles missing entity', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage, beneficiariesApi } = authenticatedUser;

    await beneficiariesApi.createBeneficiary({
      name: 'Delete 404 Test',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'DE89370400440532013000',
      bankCode: 'DEUTDEDD',
    });

    await page.route(`${API_BASE}/beneficiaries/**`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Beneficiary not found', statusCode: 404 }),
        });
      } else {
        await route.continue();
      }
    });

    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

    const removeBtn = page.getByRole('button', { name: 'Remove' }).first();
    await expect(removeBtn).toBeVisible({ timeout: 5000 });
    await removeBtn.click();

    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
  });

  /**
   * ERR-BEN-006 — Beneficiaries: GET /beneficiaries network failure
   * Classification: Acceptable behavior (error banner displayed)
   */
  uiTest('ERR-BEN-006: GET /beneficiaries network failure shows error banner', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage } = authenticatedUser;

    await page.route(`${API_BASE}/beneficiaries`, (route) => route.abort('failed'));

    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Cards Error Handling
// ─────────────────────────────────────────────────────────────────────────────

uiTest.describe('ERR — Cards', () => {

  /**
   * ERR-CARDS-001 — Cards: GET /cards 500
   *
   * WP-QA-ERR-005 (CONFIRMED DEFECT)
   *
   * Reproduction:
   * 1. Navigate to /dashboard/cards with GET /cards intercepted returning 500.
   * 2. Page error banner is rendered at top: "Failed to load cards".
   * 3. BUT the card display section renders: "No payment cards saved yet. Click below to add a card."
   * 4. The empty state is displayed simultaneously with the error, causing contradictory UI.
   */
  uiTest('ERR-CARDS-001: GET /cards 500 displays "No payment cards saved yet" simultaneously with error (WP-QA-ERR-005)', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-ERR-005 — known defect: When GET /cards returns 500, the page displays the error banner ' +
      'AND simultaneously renders the empty state message "No payment cards saved yet. Click below to add a card." ' +
      'An API load failure is presented as a valid empty state to the user.',
    );

    const { page, cardsPage } = authenticatedUser;

    await page.route(`${API_BASE}/cards`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Failed to load cards', statusCode: 500 }),
      }),
    );

    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

    // Actual behavior: error banner is displayed
    await expect(page.locator('div.bg-red-50').first()).toBeVisible({ timeout: 5000 });

    // Actual behavior: empty-state message is ALSO displayed
    const emptyMsg = page.getByText('No payment cards saved yet');
    await expect(emptyMsg).toBeVisible({ timeout: 3000 });

    // Expected behavior: empty state should NOT be rendered when load failed
    // This assertion FAILS because the empty state is displayed
    await expect(emptyMsg).not.toBeVisible({ timeout: 3000 });
  });

  /**
   * ERR-CARDS-002 — Cards: POST /cards 400 (validation failure)
   * Classification: Acceptable behavior (inline error in modal, modal stays open)
   */
  uiTest('ERR-CARDS-002: POST /cards 400 shows form-level error in modal', async ({
    authenticatedUser,
  }) => {
    const { page, cardsPage } = authenticatedUser;

    await page.route(`${API_BASE}/cards`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid card number', statusCode: 400 }),
        });
      } else {
        await route.continue();
      }
    });

    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

    await cardsPage.openAddModal();
    await expect(cardsPage.modalHeading).toBeVisible({ timeout: 5000 });

    await cardsPage.cardholderNameInput.fill('John Card');
    await cardsPage.cardNumberInput.fill('4111 1111 1111 1111');
    await cardsPage.cvvInput.fill('123');

    await cardsPage.modalSubmitButton.click();

    const formError = page.locator('[class*="red"]').filter({ hasText: /Invalid|error|failed/i });
    await expect(formError).toBeVisible({ timeout: 5000 });
    await expect(cardsPage.modalHeading).toBeVisible();
  });

  /**
   * ERR-CARDS-003 — Cards: POST /cards/:id/freeze 500
   * Classification: Acceptable behavior (page-level error banner, card status preserved)
   */
  uiTest('ERR-CARDS-003: freeze card 500 shows page-level error and preserves card list', async ({
    authenticatedUser,
  }) => {
    const { page, cardsPage, cardsApi } = authenticatedUser;

    await cardsApi.createCard({
      cardholderName: 'Freeze 500 Test',
      type: 'debit',
      cardNumber: '4111111111111111',
      expiryDate: '12/28',
      cvv: '123',
    });

    await page.route(`${API_BASE}/cards/*/freeze`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error', statusCode: 500 }),
      }),
    );

    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

    const freezeBtn = cardsPage.getFreezeButton('1111');
    await expect(freezeBtn).toBeVisible({ timeout: 5000 });
    await freezeBtn.click();

    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    await expect(cardsPage.getManagementCard('1111')).toBeVisible();
  });

  /**
   * ERR-CARDS-004 — Cards: POST /cards/:id/freeze 409 (status conflict)
   * Classification: Acceptable behavior
   */
  uiTest('ERR-CARDS-004: freeze card 409 shows error banner for status conflict', async ({
    authenticatedUser,
  }) => {
    const { page, cardsPage, cardsApi } = authenticatedUser;

    await cardsApi.createCard({
      cardholderName: 'Freeze 409 Test',
      type: 'debit',
      cardNumber: '4111111111111111',
      expiryDate: '12/28',
      cvv: '123',
    });

    await page.route(`${API_BASE}/cards/*/freeze`, (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Card is already frozen', statusCode: 409 }),
      }),
    );

    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

    const freezeBtn = cardsPage.getFreezeButton('1111');
    await expect(freezeBtn).toBeVisible({ timeout: 5000 });
    await freezeBtn.click();

    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
  });

  /**
   * ERR-CARDS-005 — Cards: DELETE /cards/:id 500
   * Classification: Acceptable behavior (card not deleted, error banner shown)
   */
  uiTest('ERR-CARDS-005: delete card 500 shows error and does not remove card from list', async ({
    authenticatedUser,
  }) => {
    const { page, cardsPage, cardsApi } = authenticatedUser;

    await cardsApi.createCard({
      cardholderName: 'Delete 500 Test',
      type: 'debit',
      cardNumber: '4111111111111111',
      expiryDate: '12/28',
      cvv: '123',
    });

    await page.route(`${API_BASE}/cards/**`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Failed to delete card', statusCode: 500 }),
        });
      } else {
        await route.continue();
      }
    });

    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });
    await expect(cardsPage.getManagementCard('1111')).toBeVisible({ timeout: 5000 });

    const removeBtn = cardsPage.getRemoveButton('1111');
    if (await removeBtn.count() > 0) {
      await removeBtn.click();
      const errorBanner = page.locator('div.bg-red-50').first();
      await expect(errorBanner).toBeVisible({ timeout: 5000 });
      await expect(cardsPage.getManagementCard('1111')).toBeVisible();
    }
  });

  /**
   * ERR-CARDS-006 — Cards: DELETE /cards/:id 404 (not found)
   * Classification: Acceptable behavior
   */
  uiTest('ERR-CARDS-006: delete card 404 shows error and preserves list', async ({
    authenticatedUser,
  }) => {
    const { page, cardsPage, cardsApi } = authenticatedUser;

    await cardsApi.createCard({
      cardholderName: 'Delete 404 Test',
      type: 'debit',
      cardNumber: '4111111111111111',
      expiryDate: '12/28',
      cvv: '123',
    });

    await page.route(`${API_BASE}/cards/**`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Card not found', statusCode: 404 }),
        });
      } else {
        await route.continue();
      }
    });

    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });
    await expect(cardsPage.getManagementCard('1111')).toBeVisible({ timeout: 5000 });

    const removeBtn = cardsPage.getRemoveButton('1111');
    if (await removeBtn.count() > 0) {
      await removeBtn.click();
      const errorBanner = page.locator('div.bg-red-50').first();
      await expect(errorBanner).toBeVisible({ timeout: 5000 });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Send Money Error Handling
// ─────────────────────────────────────────────────────────────────────────────

uiTest.describe('ERR — Send Money', () => {

  /**
   * ERR-SEND-001 — Send Money: GET /wallets/me 500
   *
   * WP-QA-ERR-002 (CONFIRMED DEFECT)
   *
   * Reproduction:
   * 1. Intercept GET /wallets/me with 500.
   * 2. User selects beneficiary and clicks Next to Step 2 (Select Source Wallet).
   * 3. Step 2 renders an infinite pulse skeleton (`<div className="h-20 ... animate-pulse" />`).
   * 4. Next button is permanently disabled (`disabled={!wallet}`).
   * 5. No user-facing error message is shown explaining why the wallet cannot be loaded.
   */
  uiTest('ERR-SEND-001: /wallets/me 500 leaves Step 2 stuck in skeleton with no error (WP-QA-ERR-002)', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-ERR-002 — known defect: When /wallets/me fails on Send Money page, Step 2 displays ' +
      'a permanent loading pulse skeleton indefinitely. Next button is permanently disabled. ' +
      'No user-facing error message or retry option is displayed.',
    );

    const { page, sendMoneyPage, beneficiariesApi } = authenticatedUser;

    await beneficiariesApi.createBeneficiary({
      name: 'Wallet Defect Beneficiary',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'DE89370400440532013000',
      bankCode: 'DEUTDEDD',
    });

    await page.route(`${API_BASE}/wallets/me`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error', statusCode: 500 }),
      }),
    );

    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });
    await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeHidden({ timeout: 5000 });

    await sendMoneyPage.selectBeneficiary('Wallet Defect Beneficiary');
    await sendMoneyPage.clickNext();

    // Step 2: Select Source Wallet
    await expect(page.getByRole('heading', { name: 'Select Source Wallet' })).toBeVisible({ timeout: 5000 });

    // Actual behavior: pulse skeleton is shown and Next is disabled
    await expect(sendMoneyPage.nextButton).toBeDisabled();

    // Expected behavior: user-facing error message should be displayed
    // This assertion FAILS because the error is silently swallowed
    const errorMsg = page.locator('[class*="red"]').filter({ hasText: /Failed to load wallet|error|unavailable/i });
    await expect(errorMsg).toBeVisible({ timeout: 3000 });
  });

  /**
   * ERR-SEND-002 — Send Money: GET /beneficiaries 500
   *
   * WP-QA-ERR-003 (CONFIRMED DEFECT)
   *
   * Reproduction:
   * 1. Intercept GET /beneficiaries with 500.
   * 2. Step 1 silently renders: "No beneficiaries saved yet. Add a beneficiary first."
   * 3. This empty state is identical to an account that genuinely has zero beneficiaries.
   * 4. No error alert or retry option is displayed.
   */
  uiTest('ERR-SEND-002: /beneficiaries 500 silently shows "No beneficiaries saved yet" (WP-QA-ERR-003)', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-ERR-003 — known defect: When GET /beneficiaries fails on Send Money page, the UI ' +
      'renders "No beneficiaries saved yet. Add a beneficiary first." — indistinguishable from a legitimate ' +
      'empty state. No error message or retry affordance is displayed.',
    );

    const { page, sendMoneyPage } = authenticatedUser;

    await page.route(`${API_BASE}/beneficiaries`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error', statusCode: 500 }),
      }),
    );

    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Actual behavior: empty message is visible
    const emptyMsg = page.getByText('No beneficiaries saved yet');
    await expect(emptyMsg).toBeVisible({ timeout: 5000 });

    // Expected behavior: a distinct error or retry affordance should be visible
    // This assertion FAILS because the defect swallows the error
    const errorBanner = page.locator('[class*="red"]').filter({ hasText: /Failed to load beneficiaries|error/i });
    await expect(errorBanner).toBeVisible({ timeout: 3000 });
  });

  /**
   * ERR-SEND-003 — Send Money: POST /transfers 400 (validation failure)
   * Classification: Acceptable behavior (inline error, wizard stays on review step)
   */
  uiTest('ERR-SEND-003: POST /transfers 400 shows inline error message on review step', async ({
    authenticatedUser,
  }) => {
    const { page, sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

    await beneficiariesApi.createBeneficiary({
      name: 'Transfer 400 Ben',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'DE89370400440532013000',
      bankCode: 'DEUTDEDD',
    });
    await fundWallet(walletApi, 1000);

    await page.route(`${API_BASE}/transfers`, (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid transfer parameters', statusCode: 400 }),
      }),
    );

    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });
    await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeHidden({ timeout: 5000 });

    await sendMoneyPage.selectBeneficiary('Transfer 400 Ben');
    await sendMoneyPage.clickNext();

    // Step 2 -> 3
    await expect(sendMoneyPage.sourceWalletHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    // Step 3 -> 4
    await expect(sendMoneyPage.amountHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.amountInput.fill('50');
    await sendMoneyPage.clickNext();

    // Step 4 -> 5
    await expect(sendMoneyPage.destCurrencyHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    // Step 5: Review
    await expect(sendMoneyPage.reviewHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickConfirmTransfer();

    const errorMsg = page.locator('[class*="red"]').filter({ hasText: /Invalid transfer|error|failed/i });
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    await expect(sendMoneyPage.reviewHeading).toBeVisible();
  });

  /**
   * ERR-SEND-004 — Send Money: POST /transfers 409 (conflict / idempotency error)
   * Classification: Acceptable behavior
   */
  uiTest('ERR-SEND-004: POST /transfers 409 shows conflict error on review step', async ({
    authenticatedUser,
  }) => {
    const { page, sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

    await beneficiariesApi.createBeneficiary({
      name: 'Transfer 409 Ben',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'DE89370400440532013000',
      bankCode: 'DEUTDEDD',
    });
    await fundWallet(walletApi, 1000);

    await page.route(`${API_BASE}/transfers`, (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Duplicate transaction detected', statusCode: 409 }),
      }),
    );

    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });
    await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeHidden({ timeout: 5000 });

    await sendMoneyPage.selectBeneficiary('Transfer 409 Ben');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.sourceWalletHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.amountHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.amountInput.fill('50');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.destCurrencyHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.reviewHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickConfirmTransfer();

    const errorMsg = page.locator('[class*="red"]').filter({ hasText: /Duplicate|conflict|error/i });
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  /**
   * ERR-SEND-005 — Send Money: POST /transfers 500
   * Classification: Acceptable behavior (error shown, Confirm button re-enabled)
   */
  uiTest('ERR-SEND-005: POST /transfers 500 shows error message and re-enables Confirm Transfer', async ({
    authenticatedUser,
  }) => {
    const { page, sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

    await beneficiariesApi.createBeneficiary({
      name: 'Transfer 500 Ben',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'DE89370400440532013000',
      bankCode: 'DEUTDEDD',
    });
    await fundWallet(walletApi, 1000);

    await page.route(`${API_BASE}/transfers`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error', statusCode: 500 }),
      }),
    );

    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });
    await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeHidden({ timeout: 5000 });

    await sendMoneyPage.selectBeneficiary('Transfer 500 Ben');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.sourceWalletHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.amountHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.amountInput.fill('50');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.destCurrencyHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.reviewHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickConfirmTransfer();

    const errorMsg = page.locator('[class*="red"]').filter({ hasText: /Internal Server Error|error|failed/i });
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    await expect(sendMoneyPage.confirmTransferButton).toBeEnabled({ timeout: 3000 });
  });

  /**
   * ERR-SEND-006 — Send Money: POST /transfers network failure
   * Classification: Acceptable behavior
   */
  uiTest('ERR-SEND-006: POST /transfers network failure shows error message', async ({
    authenticatedUser,
  }) => {
    const { page, sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

    await beneficiariesApi.createBeneficiary({
      name: 'Transfer NetFail Ben',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'DE89370400440532013000',
      bankCode: 'DEUTDEDD',
    });
    await fundWallet(walletApi, 1000);

    await page.route(`${API_BASE}/transfers`, (route) => route.abort('failed'));

    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });
    await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeHidden({ timeout: 5000 });

    await sendMoneyPage.selectBeneficiary('Transfer NetFail Ben');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.sourceWalletHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.amountHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.amountInput.fill('50');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.destCurrencyHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.reviewHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickConfirmTransfer();

    const errorMsg = page.locator('[class*="red"]').filter({ hasText: /error|failed/i });
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  /**
   * ERR-SEND-007 — Send Money: exchange-rate quote 500
   * Classification: Acceptable behavior (quoteError displayed, Confirm button disabled)
   */
  uiTest('ERR-SEND-007: exchange-rate quote 500 shows inline quote error and disables Confirm', async ({
    authenticatedUser,
  }) => {
    const { page, sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

    await beneficiariesApi.createBeneficiary({
      name: 'Quote 500 Ben',
      currency: 'INR',
      payoutMethod: 'bank_account',
      accountNumber: '1234567890',
      bankCode: 'HDFC',
    });
    await fundWallet(walletApi, 1000);

    await page.route(`${API_BASE}/exchange-rates/quote*`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Quote service unavailable', statusCode: 500 }),
      }),
    );

    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });
    await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeHidden({ timeout: 5000 });

    await sendMoneyPage.selectBeneficiary('Quote 500 Ben');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.sourceWalletHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.amountHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.amountInput.fill('50');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.destCurrencyHeading).toBeVisible({ timeout: 5000 });
    const currencySelect = page.locator('select').last();
    if (await currencySelect.count() > 0) await currencySelect.selectOption('INR');
    await sendMoneyPage.clickNext();

    // Step 5: Confirm button must be disabled when quote fails
    await expect(sendMoneyPage.reviewHeading).toBeVisible({ timeout: 5000 });
    await expect(sendMoneyPage.confirmTransferButton).toBeDisabled();
  });

  /**
   * ERR-SEND-008 — Send Money: Transaction polling failure (GET /transactions/:id 500)
   *
   * WP-QA-ERR-004 (CONFIRMED DEFECT)
   *
   * Reproduction:
   * 1. Allow initial POST /transfers to succeed (returns 201 with status: PENDING).
   * 2. Intercept subsequent polling calls to GET /api/v1/transactions/:id with 500.
   * 3. Polling catch block only logs `console.error('Error polling transaction status:', err)`.
   * 4. UI stays in "Processing Transfer" with animated spinner indefinitely.
   * 5. No user-facing error or retry affordance is displayed.
   */
  uiTest('ERR-SEND-008: transaction polling network failure shows processing spinner with no error (WP-QA-ERR-004)', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-ERR-004 — known defect: When polling GET /transactions/:id fails with 500/network failure, ' +
      'the error is silently caught with console.error only. UI remains in "Processing Transfer" with ' +
      'PENDING spinner indefinitely. No error message, retry, or recovery affordance is displayed.',
    );

    const { page, sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

    await beneficiariesApi.createBeneficiary({
      name: 'Polling Defect Ben',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'DE89370400440532013000',
      bankCode: 'DEUTDEDD',
    });
    await fundWallet(walletApi, 1000);

    let transferPostSucceeded = false;
    await page.route(`${API_BASE}/transactions/**`, async (route) => {
      if (transferPostSucceeded) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Polling service unavailable', statusCode: 500 }),
        });
      } else {
        await route.continue();
      }
    });

    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });
    await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeHidden({ timeout: 5000 });

    await sendMoneyPage.selectBeneficiary('Polling Defect Ben');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.sourceWalletHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.amountHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.amountInput.fill('50');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.destCurrencyHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.reviewHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickConfirmTransfer();
    transferPostSucceeded = true;

    // Actual behavior: UI enters "Processing Transfer" spinner
    await expect(page.getByText('Processing Transfer')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(3000);

    // Expected behavior: UI should inform user that status polling failed
    // This assertion FAILS because no polling error is presented
    const pollingError = page.locator('[class*="red"], [class*="warning"]').filter({
      hasText: /status unavailable|polling failed|failed to update/i,
    });
    await expect(pollingError).toBeVisible({ timeout: 3000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Transactions Page Error Handling
// ─────────────────────────────────────────────────────────────────────────────

uiTest.describe('ERR — Transactions Page', () => {

  /**
   * ERR-TXN-001 — Transactions: GET /transactions 500
   * Classification: Acceptable error banner shown with Retry (WP-QA-OBS-002)
   */
  uiTest('ERR-TXN-001: GET /transactions 500 shows page-level error with Retry', async ({
    authenticatedUser,
  }) => {
    const { page, transactionsPage } = authenticatedUser;

    await page.route(`${API_BASE}/transactions*`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Failed to load transactions', statusCode: 500 }),
      }),
    );

    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible({ timeout: 10000 });

    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  /**
   * ERR-TXN-002 — Transactions: status filter trigger 500
   * Classification: Acceptable behavior (error banner + retry on dynamic filter)
   */
  uiTest('ERR-TXN-002: filtering transactions with 500 response shows error and allows retry', async ({
    authenticatedUser,
  }) => {
    const { page, transactionsPage } = authenticatedUser;

    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible({ timeout: 10000 });

    await page.route(`${API_BASE}/transactions*`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Filter query failed', statusCode: 500 }),
      }),
    );

    await page.getByRole('button', { name: 'Completed' }).click();

    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  /**
   * ERR-TXN-003 — Transactions: GET /transactions network failure
   * Classification: Acceptable behavior
   */
  uiTest('ERR-TXN-003: GET /transactions network failure shows error with retry', async ({
    authenticatedUser,
  }) => {
    const { page, transactionsPage } = authenticatedUser;

    await page.route(`${API_BASE}/transactions*`, (route) => route.abort('failed'));

    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible({ timeout: 10000 });

    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — Profile Error Handling
// ─────────────────────────────────────────────────────────────────────────────

uiTest.describe('ERR — Profile', () => {

  /**
   * ERR-PROF-001 — Profile: PATCH /users/me 400 (validation failure)
   * Classification: Acceptable behavior (error message shown, form values preserved)
   */
  uiTest('ERR-PROF-001: PATCH /users/me 400 shows save-level error message and preserves inputs', async ({
    authenticatedUser,
  }) => {
    const { page, profilePage } = authenticatedUser;

    await page.route(`${API_BASE}/users/me`, async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'First name is invalid', statusCode: 400 }),
        });
      } else {
        await route.continue();
      }
    });

    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible({ timeout: 10000 });

    const firstNameInput = page.locator('input[type="text"]').first();
    await firstNameInput.fill('InvalidName123');
    await page.getByRole('button', { name: /Save Changes/i }).click();

    const saveError = page.locator('div.bg-red-50, div[class*="red"]').filter({ hasText: /First name|error|failed/i });
    await expect(saveError).toBeVisible({ timeout: 5000 });

    // User's input must be preserved
    await expect(firstNameInput).toHaveValue('InvalidName123');
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeEnabled();
  });

  /**
   * ERR-PROF-002 — Profile: PATCH /users/me 500
   * Classification: Acceptable behavior (error shown, no false success)
   */
  uiTest('ERR-PROF-002: PATCH /users/me 500 shows error and does not show success', async ({
    authenticatedUser,
  }) => {
    const { page, profilePage } = authenticatedUser;

    await page.route(`${API_BASE}/users/me`, async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error', statusCode: 500 }),
        });
      } else {
        await route.continue();
      }
    });

    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Save Changes/i }).click();

    const saveError = page.locator('div[class*="red"]').filter({ hasText: /error|failed|Internal/i });
    await expect(saveError).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Profile updated successfully')).not.toBeVisible();
  });

  /**
   * ERR-PROF-003 — Profile: PATCH /users/me network failure
   * Classification: Acceptable behavior
   */
  uiTest('ERR-PROF-003: PATCH /users/me network failure shows error message', async ({
    authenticatedUser,
  }) => {
    const { page, profilePage } = authenticatedUser;

    await page.route(`${API_BASE}/users/me`, async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Save Changes/i }).click();

    const saveError = page.locator('div[class*="red"]').filter({ hasText: /error|failed/i });
    await expect(saveError).toBeVisible({ timeout: 5000 });
  });

  /**
   * ERR-PROF-004 — Profile: PATCH /users/me success cross-check
   * Classification: Baseline cross-verification (ensures real API succeeds normally)
   */
  uiTest('ERR-PROF-004: PATCH /users/me success correctly shows success banner', async ({
    authenticatedUser,
  }) => {
    const { page, profilePage } = authenticatedUser;

    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Save Changes/i }).click();

    await expect(page.getByText('Profile updated successfully')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('div[class*="red"]').filter({ hasText: /error|failed/i })).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8 — Recovery Behavior & State Differentiation
// ─────────────────────────────────────────────────────────────────────────────

uiTest.describe('ERR — Recovery & State Differentiation', () => {

  /**
   * ERR-RECOV-001 — Dashboard: Retry button restores data after /wallets/me recovers
   * Classification: Recovery verification
   */
  uiTest('ERR-RECOV-001: dashboard Retry button successfully loads wallet after API recovery', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;

    let shouldFail = true;
    await page.route(`${API_BASE}/wallets/me`, async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Temporary wallet failure', statusCode: 500 }),
        });
      } else {
        await route.continue();
      }
    });

    await dashboardPage.goto();
    await expect(dashboardPage.walletErrorBanner).toBeVisible({ timeout: 5000 });

    // API recovers: toggle failure flag and click Retry
    shouldFail = false;
    await dashboardPage.retryButton.click();

    // Error banner should dismiss and balance heading should render
    await expect(dashboardPage.walletErrorBanner).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /€|EUR|\$|£/ })).toBeVisible({ timeout: 5000 });
  });

  /**
   * ERR-RECOV-002 — Transactions: Retry button restores table after GET /transactions recovers
   * Classification: Recovery verification
   */
  uiTest('ERR-RECOV-002: transactions Retry button restores table after API recovery', async ({
    authenticatedUser,
  }) => {
    const { page, transactionsPage } = authenticatedUser;

    let shouldFail = true;
    await page.route(`${API_BASE}/transactions*`, async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Temporary failure', statusCode: 500 }),
        });
      } else {
        await route.continue();
      }
    });

    await transactionsPage.goto();
    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });

    // API recovers: click Retry
    shouldFail = false;
    await page.getByRole('button', { name: 'Retry' }).click();

    await expect(errorBanner).not.toBeVisible({ timeout: 5000 });
  });

  /**
   * ERR-RECOV-003 — Beneficiaries: Retry button restores list after API recovery
   * Classification: Recovery verification
   */
  uiTest('ERR-RECOV-003: beneficiaries Retry button restores list after API recovery', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage } = authenticatedUser;

    let shouldFail = true;
    await page.route(`${API_BASE}/beneficiaries`, async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Temporary load failure', statusCode: 500 }),
        });
      } else {
        await route.continue();
      }
    });

    await beneficiariesPage.goto();
    const errorBanner = page.locator('div.bg-red-50').first();
    await expect(errorBanner).toBeVisible({ timeout: 5000 });

    shouldFail = false;
    await page.getByRole('button', { name: 'Retry' }).click();

    await expect(errorBanner).not.toBeVisible({ timeout: 5000 });
  });

  /**
   * ERR-RECOV-004 — Send Money: Back button navigates back to previous steps after error
   * Classification: Recovery verification
   */
  uiTest('ERR-RECOV-004: send money wizard allows Back navigation to prior steps after transfer error', async ({
    authenticatedUser,
  }) => {
    const { page, sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

    await beneficiariesApi.createBeneficiary({
      name: 'Back Nav Ben',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'DE89370400440532013000',
      bankCode: 'DEUTDEDD',
    });
    await fundWallet(walletApi, 1000);

    await page.route(`${API_BASE}/transfers`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Submission failed', statusCode: 500 }),
      }),
    );

    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });
    await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeHidden({ timeout: 5000 });

    await sendMoneyPage.selectBeneficiary('Back Nav Ben');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.sourceWalletHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.amountHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.amountInput.fill('75');
    await sendMoneyPage.clickNext();

    await expect(sendMoneyPage.destCurrencyHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickNext();

    // Fail submission on Review step
    await expect(sendMoneyPage.reviewHeading).toBeVisible({ timeout: 5000 });
    await sendMoneyPage.clickConfirmTransfer();
    await expect(page.locator('[class*="red"]').first()).toBeVisible({ timeout: 5000 });

    // Recovery: Click Back button to return to Step 4 (Currency selection)
    await sendMoneyPage.clickBack();
    await expect(sendMoneyPage.destCurrencyHeading).toBeVisible({ timeout: 5000 });

    // Click Back again to return to Step 3 (Amount) and verify entered amount is preserved
    await sendMoneyPage.clickBack();
    await expect(sendMoneyPage.amountHeading).toBeVisible({ timeout: 5000 });
    await expect(sendMoneyPage.amountInput).toHaveValue('75');
  });

  /**
   * ERR-RECOV-005 — Add Card Modal: Cancel / close dismisses modal and resets error state
   * Classification: Recovery verification
   */
  uiTest('ERR-RECOV-005: Add Card modal cancel dismisses modal cleanly', async ({
    authenticatedUser,
  }) => {
    const { cardsPage } = authenticatedUser;

    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

    await cardsPage.openAddModal();
    await expect(cardsPage.modalHeading).toBeVisible({ timeout: 5000 });

    // Fill some input in the modal
    await cardsPage.cardholderNameInput.fill('Recovery Test User');

    // Cancel modal via cancel button
    await cardsPage.closeAddModalViaCancelButton();
    await expect(cardsPage.modalHeading).not.toBeVisible({ timeout: 3000 });

    // Verify reopening modal works cleanly
    await cardsPage.openAddModal();
    await expect(cardsPage.modalHeading).toBeVisible({ timeout: 5000 });
    await cardsPage.closeAddModalViaCloseButton();
    await expect(cardsPage.modalHeading).not.toBeVisible({ timeout: 3000 });
  });

  /**
   * ERR-STATE-001 — Dashboard wallet error replaces loading state (not infinite loading)
   * Classification: State differentiation verification
   */
  uiTest('ERR-STATE-001: dashboard wallet error clears loading indicator', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;

    await page.route(`${API_BASE}/wallets/me`, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error', statusCode: 500 }),
      }),
    );

    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    await expect(dashboardPage.walletErrorBanner).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Loading WrightPay')).not.toBeVisible();
  });
});

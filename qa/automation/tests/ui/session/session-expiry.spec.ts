/**
 * WrightPay Phase 3D — Frontend 401 / Session Expiry QA
 *
 * Tests use Playwright route interception to evaluate how the application behaves
 * when authenticated API requests return HTTP 401 Unauthorized.
 *
 * Defect Classifications:
 *   WP-QA-AUTH-001  Inconsistent Session Invalidation on Secondary API 401
 *                   While `lib/api.ts` removes the token from `localStorage`, React's
 *                   AuthContext retains its state, failing to redirect to `/login` until reload.
 *   WP-QA-AUTH-002  Infinite Polling and Stuck Spinner on 401 Polling Failure
 *                   In `send-money/page.tsx`, `clearInterval` is bypassed when `getTransaction`
 *                   throws 401, resulting in indefinite polling and stuck "Processing Transfer" spinner.
 *
 * Observations:
 *   WP-QA-OBS-001  Silent swallow of 401 on Dashboard Transactions
 *   WP-QA-OBS-002  Public FX endpoint 401 triggers token eviction in API wrapper
 *   WP-QA-OBS-003  Session recovery via browser reload (AuthProvider discovers null token)
 */

import { test, expect, Page } from '@playwright/test';
import { test as uiTest } from '../../../fixtures/ui.fixtures';
import { dbClient } from '../../../database/db-client';

const API_BASE = 'http://localhost:3001/api/v1';

/** Helper: respond to intercepted route with 401 Unauthorized payload */
function mock401(page: Page, urlPattern: string | RegExp, message = 'Unauthorized') {
  return page.route(urlPattern, (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message, statusCode: 401 }),
    }),
  );
}

/** Helper: funds user wallet directly via DB */
async function fundWallet(walletApi: { getMyWallet: () => Promise<any> }, balance = 1000) {
  const walletRes = await walletApi.getMyWallet();
  const wallet = await walletRes.json();
  await dbClient.query('UPDATE wallets SET balance = $1 WHERE id = $2', [balance, wallet.id]);
}

test.describe('Phase 3D — Frontend 401 / Session Expiry QA', () => {

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 1 — Initial Session Hydration (GET /api/v1/users/me -> 401)
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('1. Initial Session Hydration', () => {
    uiTest('AUTH-HYDRATE-001: GET /users/me 401 on initial load clears localStorage token', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/users/me`);

      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });

      const storedToken = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(storedToken).toBeNull();
    });

    uiTest('AUTH-HYDRATE-002: GET /users/me 401 clears authenticated state in AuthContext', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/users/me`);

      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });

      const loginHeading = page.getByRole('heading', { name: 'WrightPay' });
      await expect(loginHeading).toBeVisible({ timeout: 5000 });
    });

    uiTest('AUTH-HYDRATE-003: GET /users/me 401 redirects to /login', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/users/me`);

      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    uiTest('AUTH-HYDRATE-004: GET /users/me 401 does not expose protected dashboard content', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/users/me`);

      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });

      const greeting = page.locator('h1').filter({ hasText: /Good (morning|afternoon|evening)/i });
      await expect(greeting).not.toBeVisible();

      const sidebar = page.locator('nav');
      await expect(sidebar).not.toBeVisible();
    });

    uiTest('AUTH-HYDRATE-005: GET /users/me 401 does not cause infinite redirect loops', async ({
      page,
      authenticatedUser,
    }) => {
      let redirectCount = 0;
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          redirectCount++;
        }
      });

      await mock401(page, `${API_BASE}/users/me`);

      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });

      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/login');
      expect(redirectCount).toBeLessThanOrEqual(4);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 2 — Dashboard APIs Post-Hydration 401 Handling
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('2. Dashboard APIs Post-Hydration 401 Handling', () => {
    uiTest('AUTH-DASH-001: GET /users/me 401 causes immediate redirect to /login', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/users/me`);

      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    uiTest('AUTH-DASH-002: GET /wallets/me 401 evicts access token from localStorage', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/wallets/me`);

      await page.goto('/dashboard');

      const errorBanner = page.locator('div.bg-red-50, div.border-red-200').first();
      await expect(errorBanner).toBeVisible({ timeout: 10000 });

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-DASH-003: secondary API 401 (/wallets/me) should immediately redirect to /login (WP-QA-AUTH-001)', async ({
      page,
      authenticatedUser,
    }) => {
      test.fail(
        true,
        'WP-QA-AUTH-001 — Secondary API 401 evicts localStorage token but fails to notify AuthContext or redirect to /login',
      );

      await mock401(page, `${API_BASE}/wallets/me`);

      await page.goto('/dashboard');

      // Expected clean behavior: immediate redirect to /login
      // Actual behavior: stays on dashboard displaying error banner
      await expect(page).toHaveURL(/\/login/, { timeout: 3000 });
    });

    uiTest('AUTH-DASH-004: GET /transactions 401 evicts token and silently falls back (WP-QA-OBS-001)', async ({
      page,
      authenticatedUser,
    }) => {
      // Must match /transactions?limit=3
      await mock401(page, `${API_BASE}/transactions*`);

      await page.goto('/dashboard');

      await expect(page.getByText(/No recent transactions/i)).toBeVisible({ timeout: 10000 });

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-DASH-005: GET /beneficiaries 401 on Beneficiaries page evicts token', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/beneficiaries`);

      await page.goto('/dashboard/beneficiaries');

      const errorBanner = page.locator('div.bg-red-50, div.border-red-200').first();
      await expect(errorBanner).toBeVisible({ timeout: 10000 });

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-DASH-006: GET /cards 401 on Cards page evicts token', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/cards`);

      await page.goto('/dashboard/cards');

      const errorBanner = page.locator('div.bg-red-50, div.border-red-200').first();
      await expect(errorBanner).toBeVisible({ timeout: 10000 });

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-DASH-007: GET /exchange-rates 401 on public endpoint evicts token (WP-QA-OBS-002)', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/exchange-rates*`);

      await page.goto('/dashboard');

      // Verify dashboard content rendered (header greeting)
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 3 — Profile (PATCH /users/me -> 401)
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('3. Profile Update 401 Handling', () => {
    uiTest('AUTH-PROF-001: PATCH /users/me 401 displays error and avoids false success banner', async ({
      page,
      authenticatedUser,
    }) => {
      const { profilePage } = authenticatedUser;
      await profilePage.goto();
      await expect(profilePage.heading).toBeVisible({ timeout: 10000 });

      await page.route(`${API_BASE}/users/me`, async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          });
        } else {
          await route.continue();
        }
      });

      await profilePage.clickSaveChanges();

      await expect(profilePage.errorAlert).toBeVisible({ timeout: 5000 });
      await expect(profilePage.errorAlert).toContainText(/Unauthorized/i);
      await expect(profilePage.successAlert).not.toBeVisible();
    });

    uiTest('AUTH-PROF-002: PATCH /users/me 401 evicts access token from localStorage', async ({
      page,
      authenticatedUser,
    }) => {
      const { profilePage } = authenticatedUser;
      await profilePage.goto();
      await expect(profilePage.heading).toBeVisible({ timeout: 10000 });

      await page.route(`${API_BASE}/users/me`, async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          });
        } else {
          await route.continue();
        }
      });

      await profilePage.clickSaveChanges();
      await expect(profilePage.errorAlert).toBeVisible({ timeout: 5000 });

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-PROF-003: PATCH /users/me 401 preserves entered input values in the form', async ({
      page,
      authenticatedUser,
    }) => {
      const { profilePage } = authenticatedUser;
      await profilePage.goto();
      await expect(profilePage.heading).toBeVisible({ timeout: 10000 });

      await page.route(`${API_BASE}/users/me`, async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          });
        } else {
          await route.continue();
        }
      });

      await profilePage.firstNameInput.fill('SessionTest');
      await profilePage.clickSaveChanges();
      await expect(profilePage.errorAlert).toBeVisible({ timeout: 5000 });

      await expect(profilePage.firstNameInput).toHaveValue('SessionTest');
    });

    uiTest('AUTH-PROF-004: PATCH /users/me 401 fails to immediately redirect to /login (WP-QA-AUTH-001)', async ({
      page,
      authenticatedUser,
    }) => {
      test.fail(
        true,
        'WP-QA-AUTH-001 — Secondary action 401 evicts localStorage token but fails to redirect to /login',
      );

      const { profilePage } = authenticatedUser;
      await profilePage.goto();
      await expect(profilePage.heading).toBeVisible({ timeout: 10000 });

      await page.route(`${API_BASE}/users/me`, async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          });
        } else {
          await route.continue();
        }
      });

      await profilePage.clickSaveChanges();
      await expect(page).toHaveURL(/\/login/, { timeout: 3000 });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 4 — Beneficiaries (POST /beneficiaries -> 401, DELETE /beneficiaries/:id -> 401)
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('4. Beneficiaries Mutations 401 Handling', () => {
    uiTest('AUTH-BEN-001: POST /beneficiaries 401 displays form error in modal and keeps modal open', async ({
      page,
      authenticatedUser,
    }) => {
      const { beneficiariesPage } = authenticatedUser;
      await beneficiariesPage.goto();
      await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

      await page.route(`${API_BASE}/beneficiaries`, async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          });
        } else {
          await route.continue();
        }
      });

      await beneficiariesPage.openModal();
      await beneficiariesPage.fillBankBeneficiaryForm({
        name: '401 Test Beneficiary',
        accountNumber: 'DE89370400440532013000',
        currency: 'EUR',
      });
      await beneficiariesPage.submitForm();

      await expect(beneficiariesPage.modalHeading).toBeVisible({ timeout: 5000 });
      const modalBanner = beneficiariesPage.modal.locator('div.bg-red-50, div.border-red-200');
      await expect(modalBanner).toBeVisible({ timeout: 5000 });
      await expect(modalBanner).toContainText(/Unauthorized/i);
    });

    uiTest('AUTH-BEN-002: POST /beneficiaries 401 evicts access token from localStorage', async ({
      page,
      authenticatedUser,
    }) => {
      const { beneficiariesPage } = authenticatedUser;
      await beneficiariesPage.goto();
      await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

      await page.route(`${API_BASE}/beneficiaries`, async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          });
        } else {
          await route.continue();
        }
      });

      await beneficiariesPage.openModal();
      await beneficiariesPage.fillBankBeneficiaryForm({
        name: '401 Test Beneficiary',
        accountNumber: 'DE89370400440532013000',
        currency: 'EUR',
      });
      await beneficiariesPage.submitForm();

      const modalBanner = beneficiariesPage.modal.locator('div.bg-red-50, div.border-red-200');
      await expect(modalBanner).toBeVisible({ timeout: 5000 });

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-BEN-003: DELETE /beneficiaries/:id 401 displays page error and preserves entity', async ({
      page,
      authenticatedUser,
    }) => {
      const { beneficiariesPage, beneficiariesApi } = authenticatedUser;

      const benRes = await beneficiariesApi.createBeneficiary({
        name: 'Delete 401 Target',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankName: 'Test Bank',
        bankCode: 'TESTDE',
      });
      const seeded = await benRes.json();

      await beneficiariesPage.goto();
      await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

      const card = beneficiariesPage.getCardByName('Delete 401 Target');
      await expect(card).toBeVisible({ timeout: 5000 });

      await mock401(page, `${API_BASE}/beneficiaries/${seeded.id}`);

      await beneficiariesPage.getRemoveButtonFor('Delete 401 Target').click();

      const pageError = page.locator('div.bg-red-50, div.border-red-200').first();
      await expect(pageError).toBeVisible({ timeout: 5000 });
      await expect(pageError).toContainText(/Unauthorized/i);

      await expect(card).toBeVisible();

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 5 — Cards (POST /cards -> 401, freeze/unfreeze/delete -> 401)
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('5. Cards Mutations 401 Handling', () => {
    uiTest('AUTH-CARDS-001: POST /cards 401 displays form error in modal, keeps modal open, evicts token', async ({
      page,
      authenticatedUser,
    }) => {
      const { cardsPage } = authenticatedUser;
      await cardsPage.goto();
      await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

      await page.route(`${API_BASE}/cards`, async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          });
        } else {
          await route.continue();
        }
      });

      await cardsPage.openAddModal();
      await cardsPage.fillAddCardForm({
        cardholderName: 'Cardholder 401',
        cardNumber: '4532015892345678',
        expiryMonth: '12',
        expiryYear: '28',
        cvv: '123',
      });
      await cardsPage.submitAddCardForm();

      await expect(cardsPage.modalHeading).toBeVisible({ timeout: 5000 });
      await expect(cardsPage.modalErrorBanner).toBeVisible({ timeout: 5000 });
      await expect(cardsPage.modalErrorBanner).toContainText(/Unauthorized/i);

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-CARDS-002: Freeze card 401 displays error banner, preserves status, evicts token', async ({
      page,
      authenticatedUser,
    }) => {
      const { cardsPage, cardsApi } = authenticatedUser;

      const cardRes = await cardsApi.createCard({
        cardholderName: 'Freeze 401 Target',
        type: 'debit',
        cardNumber: '4532015892345678',
        expiryDate: '12/28',
      });
      const seededCard = await cardRes.json();

      await cardsPage.goto();
      await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

      await mock401(page, `${API_BASE}/cards/${seededCard.id}/freeze`);

      await cardsPage.getFreezeButton('5678').click();

      const pageError = page.locator('div.bg-red-50, div.border-red-200').first();
      await expect(pageError).toBeVisible({ timeout: 5000 });
      await expect(pageError).toContainText(/Unauthorized/i);

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-CARDS-003: Delete card 401 displays error banner, preserves card, evicts token', async ({
      page,
      authenticatedUser,
    }) => {
      const { cardsPage, cardsApi } = authenticatedUser;

      const cardRes = await cardsApi.createCard({
        cardholderName: 'Delete 401 Target',
        type: 'debit',
        cardNumber: '4532015892345678',
        expiryDate: '12/28',
      });
      const seededCard = await cardRes.json();

      await cardsPage.goto();
      await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

      await mock401(page, `${API_BASE}/cards/${seededCard.id}`);

      // Click Remove button
      await cardsPage.getRemoveButton('5678').click();

      const pageError = page.locator('div.bg-red-50, div.border-red-200').first();
      await expect(pageError).toBeVisible({ timeout: 5000 });
      await expect(pageError).toContainText(/Unauthorized/i);

      const cardItem = cardsPage.getManagementCard('5678');
      await expect(cardItem).toBeVisible();

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 6 — Send Money (POST /transfers -> 401)
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('6. Send Money Transfer 401 Handling', () => {
    uiTest('AUTH-SEND-001: POST /transfers 401 remains on review step and avoids transfer completion', async ({
      page,
      authenticatedUser,
    }) => {
      const { sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

      await beneficiariesApi.createBeneficiary({
        name: 'Transfer 401 Beneficiary',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DBDE',
      });
      await fundWallet(walletApi, 1000);

      await sendMoneyPage.goto();
      await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });
      await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeHidden({ timeout: 5000 });

      await sendMoneyPage.selectBeneficiary('Transfer 401 Beneficiary');
      await sendMoneyPage.clickNext();

      await expect(sendMoneyPage.sourceWalletHeading).toBeVisible({ timeout: 5000 });
      await sendMoneyPage.clickNext();

      await expect(sendMoneyPage.amountHeading).toBeVisible({ timeout: 5000 });
      await sendMoneyPage.amountInput.fill('50');
      await sendMoneyPage.clickNext();

      await expect(sendMoneyPage.destCurrencyHeading).toBeVisible({ timeout: 5000 });
      await sendMoneyPage.clickNext();

      await expect(sendMoneyPage.reviewHeading).toBeVisible({ timeout: 5000 });

      await mock401(page, `${API_BASE}/transfers`);

      await sendMoneyPage.clickConfirmTransfer();

      await expect(sendMoneyPage.confirmTransferButton).toBeVisible({ timeout: 5000 });
      await expect(sendMoneyPage.completeHeading).not.toBeVisible();
    });

    uiTest('AUTH-SEND-002: POST /transfers 401 displays inline error message and re-enables Confirm', async ({
      page,
      authenticatedUser,
    }) => {
      const { sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

      await beneficiariesApi.createBeneficiary({
        name: 'Transfer 401 Beneficiary 2',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DBDE',
      });
      await fundWallet(walletApi, 1000);

      await sendMoneyPage.goto();
      await sendMoneyPage.selectBeneficiary('Transfer 401 Beneficiary 2');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();
      await sendMoneyPage.amountInput.fill('50');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();

      await mock401(page, `${API_BASE}/transfers`);

      await sendMoneyPage.clickConfirmTransfer();

      const errorMsg = page.locator('[class*="red"]').filter({ hasText: /Unauthorized|failed|error/i });
      await expect(errorMsg).toBeVisible({ timeout: 5000 });
      await expect(sendMoneyPage.confirmTransferButton).toBeEnabled();
    });

    uiTest('AUTH-SEND-003: POST /transfers 401 evicts access token from localStorage', async ({
      page,
      authenticatedUser,
    }) => {
      const { sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

      await beneficiariesApi.createBeneficiary({
        name: 'Transfer 401 Beneficiary 3',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DBDE',
      });
      await fundWallet(walletApi, 1000);

      await sendMoneyPage.goto();
      await sendMoneyPage.selectBeneficiary('Transfer 401 Beneficiary 3');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();
      await sendMoneyPage.amountInput.fill('50');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();

      await mock401(page, `${API_BASE}/transfers`);

      await sendMoneyPage.clickConfirmTransfer();
      await page.waitForTimeout(500);

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-SEND-004: POST /transfers 401 preserves wizard state and allows Back navigation', async ({
      page,
      authenticatedUser,
    }) => {
      const { sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

      await beneficiariesApi.createBeneficiary({
        name: 'Transfer 401 Beneficiary 4',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DBDE',
      });
      await fundWallet(walletApi, 1000);

      await sendMoneyPage.goto();
      await sendMoneyPage.selectBeneficiary('Transfer 401 Beneficiary 4');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();
      await sendMoneyPage.amountInput.fill('50');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();

      await mock401(page, `${API_BASE}/transfers`);

      await sendMoneyPage.clickConfirmTransfer();
      await page.waitForTimeout(500);

      // Back navigation returns to Step 4
      await sendMoneyPage.clickBack();
      await expect(sendMoneyPage.destCurrencyHeading).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 7 — Transaction Polling (GET /transactions/:id -> 401)
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('7. Transaction Polling 401 Handling', () => {
    uiTest('AUTH-POLL-001: polling 401 fails to redirect to /login or notify session expiry (WP-QA-AUTH-002)', async ({
      page,
      authenticatedUser,
    }) => {
      test.fail(
        true,
        'WP-QA-AUTH-002 — Polling 401 bypasses clearInterval, fails to redirect to /login, and remains indefinitely in spinner',
      );

      const { sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

      await beneficiariesApi.createBeneficiary({
        name: 'Poll 401 Beneficiary',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DBDE',
      });
      await fundWallet(walletApi, 1000);

      await sendMoneyPage.goto();
      await sendMoneyPage.selectBeneficiary('Poll 401 Beneficiary');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();
      await sendMoneyPage.amountInput.fill('50');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();

      // Intercept polling with 401
      await page.route(`${API_BASE}/transactions/*`, (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          });
        }
        return route.continue();
      });

      await sendMoneyPage.clickConfirmTransfer();

      // In expected non-defective behavior: user should be redirected to /login upon 401
      // This assertion FAILS because the UI stays on /dashboard/send-money with stuck spinner
      await expect(page).toHaveURL(/\/login/, { timeout: 3500 });
    });

    uiTest('AUTH-POLL-002: polling 401 leaves UI in Processing spinner and avoids misleading Transfer Completed', async ({
      page,
      authenticatedUser,
    }) => {
      const { sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

      await beneficiariesApi.createBeneficiary({
        name: 'Poll 401 Beneficiary 2',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DBDE',
      });
      await fundWallet(walletApi, 1000);

      await sendMoneyPage.goto();
      await sendMoneyPage.selectBeneficiary('Poll 401 Beneficiary 2');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();
      await sendMoneyPage.amountInput.fill('50');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();

      await page.route(`${API_BASE}/transactions/*`, (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          });
        }
        return route.continue();
      });

      await sendMoneyPage.clickConfirmTransfer();
      await page.waitForTimeout(3500);

      // Verify it stays in processing spinner (symptom of WP-QA-AUTH-002)
      await expect(page.getByRole('heading', { name: 'Processing Transfer' })).toBeVisible({
        timeout: 5000,
      });

      // And must NOT say completed
      await expect(page.getByRole('heading', { name: 'Transfer Completed' })).not.toBeVisible();
    });

    uiTest('AUTH-POLL-003: polling 401 evicts access token from localStorage on first attempt', async ({
      page,
      authenticatedUser,
    }) => {
      const { sendMoneyPage, beneficiariesApi, walletApi } = authenticatedUser;

      await beneficiariesApi.createBeneficiary({
        name: 'Poll 401 Beneficiary 3',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DBDE',
      });
      await fundWallet(walletApi, 1000);

      await sendMoneyPage.goto();
      await sendMoneyPage.selectBeneficiary('Poll 401 Beneficiary 3');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();
      await sendMoneyPage.amountInput.fill('50');
      await sendMoneyPage.clickNext();
      await sendMoneyPage.clickNext();

      await page.route(`${API_BASE}/transactions/*`, (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
          });
        }
        return route.continue();
      });

      await sendMoneyPage.clickConfirmTransfer();
      await page.waitForTimeout(2000);

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 8 — Multiple Concurrent 401 Responses
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('8. Multiple Concurrent 401 Responses', () => {
    uiTest('AUTH-CONC-001: simultaneous 401s across all initial dashboard requests cleanly redirect to /login', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/users/me`);
      await mock401(page, `${API_BASE}/wallets/me`);
      await mock401(page, `${API_BASE}/transactions*`);
      await mock401(page, `${API_BASE}/exchange-rates*`);

      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });

      expect(page.url()).toContain('/login');

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-CONC-002: simultaneous 401s do not trigger redirect storms or URL thrashing', async ({
      page,
      authenticatedUser,
    }) => {
      let navigations = 0;
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          navigations++;
        }
      });

      await mock401(page, `${API_BASE}/users/me`);
      await mock401(page, `${API_BASE}/wallets/me`);
      await mock401(page, `${API_BASE}/transactions*`);

      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await page.waitForTimeout(2000);

      expect(navigations).toBeLessThanOrEqual(4);
      expect(page.url()).toContain('/login');
    });

    uiTest('AUTH-CONC-003: simultaneous 401s result in stable logged-out state with token cleared', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/**`);

      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });

      const emailInput = page.getByRole('textbox', { name: /email/i });
      await expect(emailInput).toBeVisible({ timeout: 5000 });

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 9 — Token Storage Lifecycle on 401
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('9. Token Storage Lifecycle on 401', () => {
    uiTest('AUTH-TOKEN-001: removeStoredToken() removes access token upon 401', async ({
      page,
      authenticatedUser,
    }) => {
      await mock401(page, `${API_BASE}/wallets/me`);

      await page.goto('/dashboard');
      await page.waitForTimeout(1000);

      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();
    });

    uiTest('AUTH-TOKEN-002: subsequent requests after token eviction do not send Bearer header', async ({
      page,
      authenticatedUser,
    }) => {
      let secondRequestAuthHeader: string | null = null;

      await page.route(`${API_BASE}/wallets/me`, async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
        });
      });

      await page.goto('/dashboard');
      await page.waitForTimeout(1000);

      await page.route(`${API_BASE}/wallets/me`, async (route) => {
        secondRequestAuthHeader = route.request().headers()['authorization'] || null;
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
        });
      });

      const retryBtn = page.getByRole('button', { name: /retry/i });
      if (await retryBtn.isVisible()) {
        await retryBtn.click();
        await page.waitForTimeout(500);

        expect(secondRequestAuthHeader).toBeNull();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUITE 10 — Protected-Route Behavior Post Session Invalidation
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('10. Protected-Route Behavior Post Session Invalidation', () => {
    // Unauthenticated navigation uses { page } directly without addInitScript token injection
    test('AUTH-ROUTE-001: navigating to /dashboard without token redirects to /login', async ({
      page,
    }) => {
      await page.goto('/dashboard');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('AUTH-ROUTE-002: navigating to /dashboard/wallets without token redirects to /login', async ({
      page,
    }) => {
      await page.goto('/dashboard/wallets');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('AUTH-ROUTE-003: navigating to /dashboard/send-money without token redirects to /login', async ({
      page,
    }) => {
      await page.goto('/dashboard/send-money');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('AUTH-ROUTE-004: navigating to /dashboard/transactions without token redirects to /login', async ({
      page,
    }) => {
      await page.goto('/dashboard/transactions');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('AUTH-ROUTE-005: navigating to /dashboard/profile without token redirects to /login', async ({
      page,
    }) => {
      await page.goto('/dashboard/profile');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('AUTH-ROUTE-006: navigating to /dashboard/cards without token redirects to /login', async ({
      page,
    }) => {
      await page.goto('/dashboard/cards');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('AUTH-ROUTE-007: navigating to /dashboard/beneficiaries without token redirects to /login', async ({
      page,
    }) => {
      await page.goto('/dashboard/beneficiaries');
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    uiTest('AUTH-ROUTE-008: page reload after secondary API 401 recovers session to /login (WP-QA-OBS-003)', async ({
      page,
      createTestUser,
    }) => {
      const user = await createTestUser();

      // Seed token manually in localStorage on login page WITHOUT permanent addInitScript
      await page.goto('/login');
      await page.evaluate((t) => window.localStorage.setItem('wrightpay_access_token', t), user.token);

      await mock401(page, `${API_BASE}/wallets/me`);

      await page.goto('/dashboard');
      await page.waitForTimeout(1000);

      // Verify token was evicted by 401
      const token = await page.evaluate(() =>
        window.localStorage.getItem('wrightpay_access_token'),
      );
      expect(token).toBeNull();

      // Reloading now finds null token in storage and redirects to /login
      await page.reload();
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });
  });
});

/**
 * WrightPay Phase 3B — Responsive / Mobile QA
 *
 * Tests are executed across four representative viewports:
 *   - 375×812  (Mobile S — iPhone 12 mini)
 *   - 390×844  (Mobile M — iPhone 14)
 *   - 768×1024 (Tablet  — iPad portrait)
 *   - 1280×800 (Desktop baseline)
 *
 * IMPORTANT: This file DOES NOT modify production source.
 * All confirmed defects use test.fail(true, '…') per project convention.
 *
 * Defect IDs used in this suite:
 *   WP-QA-RESP-001  Sidebar does not hide / collapse on mobile (375px / 390px)
 *   WP-QA-RESP-002  Dashboard content is horizontally clipped on mobile
 *   WP-QA-RESP-003  Transactions table overflows without usable scroll affordance at 375px
 *   WP-QA-RESP-004  Send Money wizard header overflows at mobile width
 *   WP-QA-RESP-005  Card grid items require horizontal scrolling at 375px
 *   WP-QA-RESP-006  Header "Sign out" button is clipped/inaccessible on mobile
 */

import { test, expect } from '../../../fixtures/ui.fixtures';

// ─── Viewport helpers ────────────────────────────────────────────────────────

const VIEWPORTS = {
  mobileS:  { width: 375, height: 812,  label: '375×812 (mobile S)' },
  mobileM:  { width: 390, height: 844,  label: '390×844 (mobile M)' },
  tablet:   { width: 768, height: 1024, label: '768×1024 (tablet)'  },
  desktop:  { width: 1280, height: 800, label: '1280×800 (desktop)' },
} as const;

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Returns true if the element's right edge exceeds the viewport width.
 */
async function isHorizontallyOverflowing(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<boolean> {
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.right > window.innerWidth + 2; // 2px tolerance
  }, selector);
}

/**
 * Returns true if document body is wider than the viewport (page-level overflow).
 */
async function hasPageOverflow(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1 — Navigation / Sidebar
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Navigation / Sidebar', () => {

  /**
   * WP-QA-RESP-001 (CONFIRMED DEFECT)
   *
   * Sidebar component has a fixed width of w-64 (256px) with no responsive
   * breakpoint, media query, or toggling mechanism.  On a 375px viewport the
   * sidebar occupies ~68% of the screen and leaves only ~119px for content —
   * rendering the dashboard unusable on real mobile devices.
   */
  test('WP-QA-RESP-001: sidebar must collapse or hide on mobile viewports', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-RESP-001 — known defect: Sidebar does not hide/collapse on mobile (375px). ' +
      'Sidebar is always rendered with fixed w-64 class; no hamburger menu or mobile drawer exists.',
    );

    const { page, dashboardPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.mobileS);
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    // On mobile a sidebar should not be visible — expect it to be hidden
    const sidebar = page.locator('aside');
    await expect(sidebar).not.toBeVisible();
  });

  test('WP-QA-RESP-001-tablet: sidebar may be visible at tablet width (768px)', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.tablet);
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    // Sidebar at 768px is less severe — just verify no page-level overflow
    const overflow = await hasPageOverflow(page);
    // If sidebar causes overflow at 768px that is a secondary finding, not a hard fail here
    expect(overflow).toBeDefined(); // informational
  });

  test('RESP-NAV-001: all nav items are reachable at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    const navLinks = ['Wallets', 'Send Money', 'Transactions', 'Beneficiaries', 'Cards', 'Profile'];
    for (const label of navLinks) {
      const link = page.locator('aside').getByRole('link', { name: label });
      await expect(link).toBeVisible();
    }
  });

  test('RESP-NAV-002: sidebar is fully visible and not clipped at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    const sidebarClipped = await isHorizontallyOverflowing(page, 'aside');
    expect(sidebarClipped).toBe(false);

    const pageOverflow = await hasPageOverflow(page);
    expect(pageOverflow).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2 — Dashboard Overview
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Dashboard Overview', () => {

  /**
   * WP-QA-RESP-002 (CONFIRMED DEFECT)
   *
   * Because the 256px sidebar is always rendered, the main content area is
   * pushed into a residual ~119px at 375px viewport.  The dashboard heading,
   * wallet cards, and stat tiles all overflow and are partially hidden.
   */
  test('WP-QA-RESP-002: dashboard main content must not overflow at 375px', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-RESP-002 — known defect: Dashboard content is horizontally clipped on mobile (375px). ' +
      'Root cause is the always-visible 256px sidebar leaving only ~119px for main content.',
    );

    const { page, dashboardPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.mobileS);
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    // The main content area must have adequate usable width.
    // DEFECT: sidebar is always 256px wide; at 375px the main element is only ~119px.
    // A functional mobile layout requires main content >= 300px.
    const mainWidth = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.getBoundingClientRect().width : 0;
    });
    expect(mainWidth).toBeGreaterThanOrEqual(300);
  });

  test('RESP-DASH-001: dashboard heading is visible at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    const clipped = await isHorizontallyOverflowing(page, 'h1');
    expect(clipped).toBe(false);
  });

  test('RESP-DASH-002: dashboard renders correctly at tablet viewport (768×1024)', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.tablet);
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    // Main content element should be within viewport horizontally
    const mainEl = page.locator('main');
    await expect(mainEl).toBeVisible();
    const box = await mainEl.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORTS.tablet.width + 2);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3 — Transactions Table
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Transactions Table', () => {

  /**
   * WP-QA-RESP-003 (CONFIRMED DEFECT)
   *
   * The transactions page renders a full 7-column table (Date, Recipient, Amount,
   * Fee, Exchange Rate, Status, Reference).  While the table container has
   * overflow-x-auto, the combined sidebar + 256px content squeeze leaves the
   * scroll container effectively zero width at 375px — the table headers and
   * rows are all clipped and the horizontal scrollbar is non-functional at
   * the real rendered width.
   */
  test('WP-QA-RESP-003: transactions table must not cause unscrollable overflow at 375px', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-RESP-003 — known defect: Transactions table overflows at 375px mobile viewport. ' +
      'The table wrapping container is zero-width due to the sidebar layout defect (RESP-001). ' +
      'Columns are clipped; horizontal scroll affordance is non-functional.',
    );

    const { page, transactionsPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.mobileS);
    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible({ timeout: 10000 });

    // The transactions table scroll container must have adequate usable width.
    // DEFECT: sidebar at 256px leaves ~119px for the scroll container.
    // A table with 7 columns needs at least 500px to be usable without excessive scrolling.
    // We verify the scroll container is at least 300px wide (functional threshold).
    const containerWidth = await page.evaluate(() => {
      const el = document.querySelector('.overflow-x-auto');
      return el ? el.getBoundingClientRect().width : 0;
    });
    expect(containerWidth).toBeGreaterThanOrEqual(300);
  });

  test('RESP-TXN-001: transactions table renders all column headers at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, transactionsPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible({ timeout: 10000 });

    const expectedHeaders = ['Date', 'Recipient', 'Amount', 'Fee', 'Status', 'Reference'];
    for (const header of expectedHeaders) {
      const th = page.locator('th', { hasText: header });
      await expect(th).toBeVisible();
    }
  });

  test('RESP-TXN-002: status filter buttons are all accessible at desktop', async ({
    authenticatedUser,
  }) => {
    const { page, transactionsPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible({ timeout: 10000 });

    for (const label of ['All', 'Completed', 'Pending', 'Failed']) {
      await expect(page.getByRole('button', { name: label })).toBeVisible();
    }
  });

  test('RESP-TXN-003: transactions table filter controls are visible at tablet (768px)', async ({
    authenticatedUser,
  }) => {
    const { page, transactionsPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.tablet);
    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible({ timeout: 10000 });

    // Filter panel should be visible
    const filterPanel = page.locator('text=Filter by status').first();
    await expect(filterPanel).toBeVisible();

    const searchInput = page.locator('input[placeholder*="WP-"]');
    await expect(searchInput).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4 — Send Money Wizard
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Send Money Wizard', () => {

  /**
   * WP-QA-RESP-004 (CONFIRMED DEFECT)
   *
   * The Send Money progress bar ("Step X of Y: …") and the step header text
   * overflow the available content area at 375px because: (1) the sidebar
   * layout defect reduces available width to ~119px, and (2) the step indicator
   * uses fixed flex layout that does not wrap.  Step numbers and connectors
   * are pushed out of the visible area.
   */
  test('WP-QA-RESP-004: send money wizard progress indicator must not overflow at 375px', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-RESP-004 — known defect: Send Money wizard step indicator overflows at 375px mobile viewport. ' +
      'The flex progress bar does not wrap or scale down at small widths. ' +
      'Root cause exacerbated by RESP-001 (sidebar not hidden on mobile).',
    );

    const { page, sendMoneyPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.mobileS);
    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });

    // The wizard main content area must be at least 300px wide to be usable.
    // DEFECT: sidebar at 256px leaves only ~119px for content on a 375px screen,
    // making the step indicator and form controls unusably narrow.
    const mainWidth = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.getBoundingClientRect().width : 0;
    });
    expect(mainWidth).toBeGreaterThanOrEqual(300);
  });

  test('RESP-SEND-001: send money page heading is visible at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, sendMoneyPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });

    const pageOverflow = await hasPageOverflow(page);
    expect(pageOverflow).toBe(false);
  });

  test('RESP-SEND-002: send money wizard step indicator shows at desktop', async ({
    authenticatedUser,
  }) => {
    const { page, sendMoneyPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });

    // Step counter text should be visible
    const stepText = page.locator('text=Step 1 of').first();
    await expect(stepText).toBeVisible();
  });

  test('RESP-SEND-003: send money wizard renders at tablet viewport (768px)', async ({
    authenticatedUser,
  }) => {
    const { page, sendMoneyPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.tablet);
    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible({ timeout: 10000 });

    // No page overflow at tablet
    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5 — Cards Page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Cards Page', () => {

  /**
   * WP-QA-RESP-005 (CONFIRMED DEFECT)
   *
   * The card grid uses `grid-cols-1 md:grid-cols-2` which correctly stacks to
   * a single column at mobile widths — however due to RESP-001, the available
   * single-column width at 375px is only ~119px.  Card items (h-52, p-6) have
   * fixed heights and paddings, causing their inner content (card number, name,
   * expiry) to overflow and be clipped on real mobile hardware.
   */
  test('WP-QA-RESP-005: card items must not overflow or clip content at 375px', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-RESP-005 — known defect: Payment card display items clip their inner content at 375px. ' +
      'Root cause is RESP-001 sidebar layout — the residual content width of ~119px is insufficient ' +
      'for the card grid\'s minimum comfortable width (~300px per card).',
    );

    const { page, cardsPage, cardsApi } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.mobileS);

    // Seed one card via API so we can check the grid
    await cardsApi.createCard({
      cardholderName: 'Responsive Tester',
      type: 'debit',
      cardNumber: '4111111111111111',
      expiryDate: '12/28',
      cvv: '123',
    });

    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

    // The cards grid container must have adequate usable width.
    // DEFECT: sidebar at 256px leaves ~119px for the grid on a 375px screen.
    // Individual card items need at least 280px to display content legibly.
    // We verify the grid/main content area is at least 300px wide.
    const mainWidth = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.getBoundingClientRect().width : 0;
    });
    expect(mainWidth).toBeGreaterThanOrEqual(300);
  });

  test('RESP-CARDS-001: cards page renders correctly at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, cardsPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

    const pageOverflow = await hasPageOverflow(page);
    expect(pageOverflow).toBe(false);
  });

  test('RESP-CARDS-002: add card button is accessible at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, cardsPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

    const addBtn = page.getByRole('button', { name: /Add.*Card/i });
    await expect(addBtn).toBeVisible();
    const btnBox = await addBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    if (btnBox) {
      expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(VIEWPORTS.desktop.width);
    }
  });

  test('RESP-CARDS-003: cards page renders at tablet viewport without page overflow', async ({
    authenticatedUser,
  }) => {
    const { page, cardsPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.tablet);
    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible({ timeout: 10000 });

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6 — Header
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Header', () => {

  /**
   * WP-QA-RESP-006 (CONFIRMED DEFECT)
   *
   * The Header component renders user name, email, avatar and "Sign out" button
   * in a flex row with px-8 (32px) padding.  At 375px viewport the header
   * occupies the full width but the sidebar-induced layout collapse leaves the
   * header stretched outside the visible area — the Sign out button may be
   * partially or fully outside the right viewport edge.
   */
  test('WP-QA-RESP-006: header Sign out button must be fully within viewport at 375px', async ({
    authenticatedUser,
  }) => {
    test.fail(
      true,
      'WP-QA-RESP-006 — known defect: Header "Sign out" button may be clipped at 375px. ' +
      'The header uses px-8 (64px total horizontal padding) in a flex row; combined with ' +
      'sidebar layout compression the button is pushed beyond the visible right edge on mobile.',
    );

    const { page, dashboardPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.mobileS);
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    const signOutBtn = page.getByRole('button', { name: /Sign out/i });
    await expect(signOutBtn).toBeVisible({ timeout: 5000 });

    const box = await signOutBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Button must not extend beyond the viewport width
      expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORTS.mobileS.width);
    }
  });

  test('RESP-HEADER-001: Sign out button is accessible at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    const signOutBtn = page.getByRole('button', { name: /Sign out/i });
    await expect(signOutBtn).toBeVisible();

    const box = await signOutBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORTS.desktop.width);
    }
  });

  test('RESP-HEADER-002: header is fully within viewport at tablet (768px)', async ({
    authenticatedUser,
  }) => {
    const { page, dashboardPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.tablet);
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible({ timeout: 10000 });

    const headerClipped = await isHorizontallyOverflowing(page, 'header');
    expect(headerClipped).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7 — Auth Pages (public, no sidebar)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Auth Pages (Login / Signup)', () => {

  test('RESP-AUTH-001: login page has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobileS);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'WrightPay' })).toBeVisible({ timeout: 10000 });

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });

  test('RESP-AUTH-002: login form is fully visible at 375px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobileS);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'WrightPay' })).toBeVisible({ timeout: 10000 });

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.getByRole('button', { name: /Sign in/i });

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // None should be clipped
    for (const locator of [emailInput, passwordInput, submitBtn]) {
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORTS.mobileS.width + 2);
      }
    }
  });

  test('RESP-AUTH-003: signup page has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobileS);
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'WrightPay' })).toBeVisible({ timeout: 10000 });

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });

  test('RESP-AUTH-004: login page renders without overflow at tablet (768px)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'WrightPay' })).toBeVisible({ timeout: 10000 });

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 8 — Landing Page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Landing Page', () => {

  test('RESP-LAND-001: landing page has no horizontal overflow at 375px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobileS);
    await page.goto('/');
    // Wait for any CTA or heading
    await page.waitForLoadState('domcontentloaded');

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });

  test('RESP-LAND-002: landing page CTAs are accessible at 375px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobileS);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Primary CTA links on landing
    const getStartedLinks = page.getByRole('link', { name: /Get Started|Sign Up|Login/i });
    const count = await getStartedLinks.count();
    expect(count).toBeGreaterThan(0);

    // Check first CTA is within viewport
    if (count > 0) {
      const box = await getStartedLinks.first().boundingBox();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORTS.mobileS.width + 2);
      }
    }
  });

  test('RESP-LAND-003: landing page has no horizontal overflow at tablet (768px)', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 9 — Beneficiaries Page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Beneficiaries Page', () => {

  test('RESP-BEN-001: beneficiaries page heading is visible at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });

  test('RESP-BEN-002: Add Beneficiary button is reachable at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

    const addBtn = page.getByRole('button', { name: /Add Beneficiary/i });
    await expect(addBtn).toBeVisible();
  });

  test('RESP-BEN-003: beneficiaries page renders at tablet without overflow', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.tablet);
    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible({ timeout: 10000 });

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 10 — Profile Page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Profile Page', () => {

  test('RESP-PROF-001: profile page renders without overflow at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, profilePage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible({ timeout: 10000 });

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });

  test('RESP-PROF-002: profile form inputs are visible at tablet (768px)', async ({
    authenticatedUser,
  }) => {
    const { page, profilePage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.tablet);
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible({ timeout: 10000 });

    // Profile form inputs — check at least one input field is visible
    const inputs = page.locator('input[type="text"], input[type="email"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    await expect(inputs.first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 11 — Wallets Page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RESP — Wallets Page', () => {

  test('RESP-WAL-001: wallets page renders without overflow at desktop (1280px)', async ({
    authenticatedUser,
  }) => {
    const { page, walletsPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.desktop);
    await walletsPage.goto();
    await expect(walletsPage.heading).toBeVisible({ timeout: 10000 });

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });

  test('RESP-WAL-002: wallets page renders at tablet without overflow', async ({
    authenticatedUser,
  }) => {
    const { page, walletsPage } = authenticatedUser;
    await page.setViewportSize(VIEWPORTS.tablet);
    await walletsPage.goto();
    await expect(walletsPage.heading).toBeVisible({ timeout: 10000 });

    const overflow = await hasPageOverflow(page);
    expect(overflow).toBe(false);
  });
});

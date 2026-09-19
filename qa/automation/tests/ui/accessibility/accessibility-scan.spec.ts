import { test, expect } from '../../../fixtures/ui.fixtures';
import { runAxeScan, FormattedViolation } from '../../../utils/accessibility.helper';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Accessibility Audit — Automated Axe Scans (Phase 3A)', () => {
  const allPageViolations: Record<string, FormattedViolation[]> = {};

  test.afterAll(async () => {
    // Write comprehensive machine-readable scan report
    const reportDir = path.resolve(__dirname, '../../../../reports/accessibility');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    const reportPath = path.join(reportDir, 'axe-scan-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(allPageViolations, null, 2));
    const rootReportPath = path.resolve(__dirname, '../../../../axe-scan-results.json');
    fs.writeFileSync(rootReportPath, JSON.stringify(allPageViolations, null, 2));
  });

  test('Scan 1: Landing Page (/)', async ({ page, landingPage }) => {
    await landingPage.goto();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/'] = formattedViolations;
    // Log discovery summary
    console.log(`Landing Page (/) violations: ${formattedViolations.length}`);
  });

  test('Scan 2: Login Page (/login)', async ({ page, loginPage }) => {
    await loginPage.goto();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/login'] = formattedViolations;
    console.log(`Login Page (/login) violations: ${formattedViolations.length}`);
  });

  test('Scan 3: Signup Page (/signup)', async ({ page, signupPage }) => {
    await signupPage.goto();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/signup'] = formattedViolations;
    console.log(`Signup Page (/signup) violations: ${formattedViolations.length}`);
  });

  test('Scan 4: Dashboard Overview (/dashboard)', async ({ authenticatedUser }) => {
    const { page, dashboardPage } = authenticatedUser;
    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/dashboard'] = formattedViolations;
    console.log(`Dashboard (/dashboard) violations: ${formattedViolations.length}`);
  });

  test('Scan 5: Wallets Page (/dashboard/wallets)', async ({ authenticatedUser }) => {
    const { page, walletsPage } = authenticatedUser;
    await walletsPage.goto();
    await expect(walletsPage.heading).toBeVisible();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/dashboard/wallets'] = formattedViolations;
    console.log(`Wallets (/dashboard/wallets) violations: ${formattedViolations.length}`);
  });

  test('Scan 6: Send Money Wizard (/dashboard/send-money)', async ({ authenticatedUser }) => {
    const { page, sendMoneyPage } = authenticatedUser;
    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/dashboard/send-money'] = formattedViolations;
    console.log(`Send Money (/dashboard/send-money) violations: ${formattedViolations.length}`);
  });

  test('Scan 7: Transactions History (/dashboard/transactions)', async ({ authenticatedUser }) => {
    const { page, transactionsPage } = authenticatedUser;
    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/dashboard/transactions'] = formattedViolations;
    console.log(`Transactions (/dashboard/transactions) violations: ${formattedViolations.length}`);
  });

  test('Scan 8: Beneficiaries Page (/dashboard/beneficiaries)', async ({ authenticatedUser }) => {
    const { page, beneficiariesPage } = authenticatedUser;
    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/dashboard/beneficiaries'] = formattedViolations;
    console.log(`Beneficiaries (/dashboard/beneficiaries) violations: ${formattedViolations.length}`);
  });

  test('Scan 9: Add Beneficiary Modal', async ({ authenticatedUser }) => {
    const { page, beneficiariesPage } = authenticatedUser;
    await beneficiariesPage.goto();
    await expect(beneficiariesPage.heading).toBeVisible();
    await beneficiariesPage.openModal();
    await expect(beneficiariesPage.modalHeading).toBeVisible();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/dashboard/beneficiaries#modal'] = formattedViolations;
    console.log(`Add Beneficiary Modal violations: ${formattedViolations.length}`);
  });

  test('Scan 10: Cards Page (/dashboard/cards)', async ({ authenticatedUser }) => {
    const { page, cardsPage } = authenticatedUser;
    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/dashboard/cards'] = formattedViolations;
    console.log(`Cards (/dashboard/cards) violations: ${formattedViolations.length}`);
  });

  test('Scan 11: Add Card Modal', async ({ authenticatedUser }) => {
    const { page, cardsPage } = authenticatedUser;
    await cardsPage.goto();
    await expect(cardsPage.heading).toBeVisible();
    await cardsPage.openAddModal();
    await expect(cardsPage.modalHeading).toBeVisible();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/dashboard/cards#modal'] = formattedViolations;
    console.log(`Add Card Modal violations: ${formattedViolations.length}`);
  });

  test('Scan 12: Profile Page (/dashboard/profile)', async ({ authenticatedUser }) => {
    const { page, profilePage } = authenticatedUser;
    await profilePage.goto();
    await expect(profilePage.heading).toBeVisible();
    const { formattedViolations } = await runAxeScan(page);
    allPageViolations['/dashboard/profile'] = formattedViolations;
    console.log(`Profile (/dashboard/profile) violations: ${formattedViolations.length}`);
  });
});

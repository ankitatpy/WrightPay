import { test, expect } from '../../../fixtures/ui.fixtures';
import {
  generateTestBeneficiaryData,
  generateTestUpiBeneficiaryData,
} from '../../../test-data/beneficiary.factory';

test.describe('Beneficiaries UI Suite — Phase 2A', () => {
  // =========================================================================
  // 1. EMPTY STATE
  // =========================================================================
  test('1. Empty state is displayed when authenticated user has zero beneficiaries', async ({
    authenticatedUser,
  }) => {
    const { beneficiariesPage, beneficiariesApi } = authenticatedUser;

    // Verify baseline backend state is empty for this isolated user
    const preCheckRes = await beneficiariesApi.getMyBeneficiaries();
    expect(preCheckRes.status()).toBe(200);
    const preCheckList = await preCheckRes.json();
    expect(preCheckList).toEqual([]);

    // Navigate to beneficiaries dashboard
    await beneficiariesPage.goto();

    // Verify page header and layout
    await expect(beneficiariesPage.heading).toBeVisible();
    await expect(beneficiariesPage.subheading).toBeVisible();

    // Verify capacity count displays zero
    await expect(beneficiariesPage.capacityText).toHaveText('0 of 3');

    // Verify empty state banner message
    await expect(beneficiariesPage.emptyStateMessage).toBeVisible();
    await expect(beneficiariesPage.emptyStateMessage).toHaveText(
      'No beneficiaries saved yet. Click below to add your first beneficiary.'
    );

    // Verify Add Beneficiary action is available
    await expect(beneficiariesPage.addBeneficiaryCard).toBeVisible();
    await expect(beneficiariesPage.addBeneficiaryButton).toBeVisible();
    await expect(beneficiariesPage.addBeneficiaryButton).toBeEnabled();
  });

  // =========================================================================
  // 2. ADD BENEFICIARY MODAL
  // =========================================================================
  test('2. Add Beneficiary modal opens, renders all fields, accepts input, and closes cleanly', async ({
    authenticatedUser,
  }) => {
    const { beneficiariesPage } = authenticatedUser;

    await beneficiariesPage.goto();

    // Open modal
    await beneficiariesPage.openModal();

    // Verify modal presence and title
    await expect(beneficiariesPage.modal).toBeVisible();
    await expect(beneficiariesPage.modalHeading).toHaveText('Add New Beneficiary');

    // Verify expected input fields and selectors are visible
    await expect(beneficiariesPage.nameInput).toBeVisible();
    await expect(beneficiariesPage.currencySelect).toBeVisible();
    await expect(beneficiariesPage.payoutMethodSelect).toBeVisible();
    await expect(beneficiariesPage.accountNumberInput).toBeVisible();
    await expect(beneficiariesPage.bankNameInput).toBeVisible();
    await expect(beneficiariesPage.bankCodeInput).toBeVisible();

    // Verify action buttons
    await expect(beneficiariesPage.modalSubmitButton).toBeVisible();
    await expect(beneficiariesPage.modalCancelButton).toBeVisible();
    await expect(beneficiariesPage.modalCloseButton).toBeVisible();

    // Verify form fields are interactable and usable
    await beneficiariesPage.nameInput.fill('Sarah Connor');
    await expect(beneficiariesPage.nameInput).toHaveValue('Sarah Connor');

    await beneficiariesPage.currencySelect.selectOption('USD');
    await expect(beneficiariesPage.currencySelect).toHaveValue('USD');

    await beneficiariesPage.accountNumberInput.fill('US123456789012');
    await expect(beneficiariesPage.accountNumberInput).toHaveValue('US123456789012');

    // Verify closing via Cancel button
    await beneficiariesPage.closeModalViaCancelButton();
    await expect(beneficiariesPage.modal).toBeHidden();

    // Verify reopening and closing via top-right ✕ button
    await beneficiariesPage.openModal();
    await expect(beneficiariesPage.modal).toBeVisible();
    await beneficiariesPage.closeModalViaCloseButton();
    await expect(beneficiariesPage.modal).toBeHidden();
  });

  // =========================================================================
  // 3. CREATE BANK ACCOUNT BENEFICIARY (UI -> API Integration)
  // =========================================================================
  test('3. Creates Bank Account beneficiary via UI and verifies persistence via API', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage, beneficiariesApi } = authenticatedUser;

    await beneficiariesPage.goto();
    await beneficiariesPage.openModal();

    const bankBeneficiary = generateTestBeneficiaryData({
      name: 'Fatima Al-Zahra',
      currency: 'EUR',
      accountNumber: 'DE89370400440532013000',
      bankName: 'Deutsche Bank Frankfurt',
      bankCode: 'DEUTDEDD',
    });

    await beneficiariesPage.fillBankBeneficiaryForm({
      name: bankBeneficiary.name,
      currency: bankBeneficiary.currency,
      accountNumber: bankBeneficiary.accountNumber!,
      bankName: bankBeneficiary.bankName,
      bankCode: bankBeneficiary.bankCode,
    });

    // Intercept and wait for the POST /beneficiaries network request
    const postResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/beneficiaries') && res.request().method() === 'POST'
    );

    await beneficiariesPage.submitForm();

    const postResponse = await postResponsePromise;
    expect(postResponse.status()).toBe(201);
    const postData = await postResponse.json();
    expect(postData.id).toBeDefined();
    expect(postData.name).toBe(bankBeneficiary.name);

    // Verify modal closes upon successful creation
    await expect(beneficiariesPage.modal).toBeHidden();

    // Verify beneficiary card appears in the UI
    const card = beneficiariesPage.getCardByName(bankBeneficiary.name);
    await expect(card).toBeVisible();
    await expect(card).toContainText(bankBeneficiary.name);
    await expect(card).toContainText('EUR Account');
    await expect(card).toContainText(bankBeneficiary.bankName!);
    await expect(card).toContainText(bankBeneficiary.bankCode!);

    // Verify capacity updates from 0 to 1
    await expect(beneficiariesPage.capacityText).toHaveText('1 of 3');
    await expect(beneficiariesPage.emptyStateMessage).toBeHidden();

    // Independently verify state via backend GET /beneficiaries API
    const apiRes = await beneficiariesApi.getMyBeneficiaries();
    expect(apiRes.status()).toBe(200);
    const apiBeneficiaries = await apiRes.json();
    expect(apiBeneficiaries).toHaveLength(1);
    expect(apiBeneficiaries[0].id).toBe(postData.id);
    expect(apiBeneficiaries[0].name).toBe(bankBeneficiary.name);
    expect(apiBeneficiaries[0].currency).toBe('EUR');
    expect(apiBeneficiaries[0].payoutMethod).toBe('bank_account');
    expect(apiBeneficiaries[0].accountNumber).toBe(bankBeneficiary.accountNumber);
  });

  // =========================================================================
  // 4. CREATE UPI BENEFICIARY (UI -> API Integration)
  // =========================================================================
  test('4. Creates UPI beneficiary with INR currency and verifies UI and API persistence', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage, beneficiariesApi } = authenticatedUser;

    await beneficiariesPage.goto();
    await beneficiariesPage.openModal();

    const upiBeneficiary = generateTestUpiBeneficiaryData({
      name: 'Aarav Sharma',
      upiId: 'aarav.sharma@okhdfcbank',
    });

    // Fill form using UPI payout method and INR currency
    await beneficiariesPage.fillUpiBeneficiaryForm({
      name: upiBeneficiary.name,
      currency: 'INR',
      upiId: upiBeneficiary.upiId!,
    });

    // Verify UI dynamically hides bank-specific inputs when UPI is selected
    await expect(beneficiariesPage.bankNameInput).toBeHidden();
    await expect(beneficiariesPage.bankCodeInput).toBeHidden();
    await expect(beneficiariesPage.upiIdInput).toBeVisible();
    await expect(beneficiariesPage.upiIdInput).toHaveValue(upiBeneficiary.upiId!);

    // Intercept and wait for the POST /beneficiaries network request
    const postResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/beneficiaries') && res.request().method() === 'POST'
    );

    await beneficiariesPage.submitForm();

    const postResponse = await postResponsePromise;
    expect(postResponse.status()).toBe(201);
    const postData = await postResponse.json();
    expect(postData.id).toBeDefined();
    expect(postData.name).toBe(upiBeneficiary.name);
    expect(postData.payoutMethod).toBe('upi');

    // Verify modal closes
    await expect(beneficiariesPage.modal).toBeHidden();

    // Verify beneficiary card renders UPI details
    const card = beneficiariesPage.getCardByName(upiBeneficiary.name);
    await expect(card).toBeVisible();
    await expect(card).toContainText(upiBeneficiary.name);
    await expect(card).toContainText('INR Account');
    await expect(card).toContainText(upiBeneficiary.upiId!);

    // Verify Send Money action link references beneficiary
    const sendMoneyLink = beneficiariesPage.getSendMoneyLinkFor(upiBeneficiary.name);
    await expect(sendMoneyLink).toBeVisible();

    // Independently verify state via backend GET /beneficiaries API
    const apiRes = await beneficiariesApi.getMyBeneficiaries();
    expect(apiRes.status()).toBe(200);
    const apiBeneficiaries = await apiRes.json();
    expect(apiBeneficiaries).toHaveLength(1);
    expect(apiBeneficiaries[0].id).toBe(postData.id);
    expect(apiBeneficiaries[0].name).toBe(upiBeneficiary.name);
    expect(apiBeneficiaries[0].currency).toBe('INR');
    expect(apiBeneficiaries[0].payoutMethod).toBe('upi');
    expect(apiBeneficiaries[0].upiId).toBe(upiBeneficiary.upiId);
  });

  // =========================================================================
  // 5. THREE-BENEFICIARY LIMIT (Boundary State)
  // =========================================================================
  test('5. Enforces 3-beneficiary capacity limit: shows 3 of 3, blocks Add action, and displays warning', async ({
    authenticatedUser,
  }) => {
    const { beneficiariesPage, beneficiariesApi } = authenticatedUser;

    // Fast seed 3 beneficiaries via API to test frontend boundary condition
    const b1 = generateTestBeneficiaryData({ name: 'Alpha Horizon' });
    const b2 = generateTestBeneficiaryData({ name: 'Beta Logistics' });
    const b3 = generateTestBeneficiaryData({ name: 'Gamma Capital' });

    const [res1, res2, res3] = await Promise.all([
      beneficiariesApi.createBeneficiary(b1),
      beneficiariesApi.createBeneficiary(b2),
      beneficiariesApi.createBeneficiary(b3),
    ]);

    expect(res1.status()).toBe(201);
    expect(res2.status()).toBe(201);
    expect(res3.status()).toBe(201);

    // Open beneficiaries dashboard
    await beneficiariesPage.goto();

    // Verify capacity indicator communicates maximum capacity (3 of 3, 100%)
    await expect(beneficiariesPage.capacityText).toHaveText('3 of 3');
    await expect(beneficiariesPage.capacityPercentage).toHaveText('100%');

    // Verify all 3 cards are rendered
    await expect(beneficiariesPage.beneficiaryCards).toHaveCount(3);
    await expect(beneficiariesPage.getCardByName('Alpha Horizon')).toBeVisible();
    await expect(beneficiariesPage.getCardByName('Beta Logistics')).toBeVisible();
    await expect(beneficiariesPage.getCardByName('Gamma Capital')).toBeVisible();

    // Verify the "Add Beneficiary" card and button are blocked / removed from the UI
    await expect(beneficiariesPage.addBeneficiaryCard).toBeHidden();
    await expect(beneficiariesPage.addBeneficiaryButton).toBeHidden();

    // Verify maximum capacity alert banner is displayed
    await expect(beneficiariesPage.maxCapacityBanner).toBeVisible();
    await expect(beneficiariesPage.maxCapacityBanner).toHaveText(
      'You have reached the maximum of 3 beneficiaries. Remove one to add another.'
    );
  });

  // =========================================================================
  // 6. DELETE BENEFICIARY (UI -> API Integration)
  // =========================================================================
  test('6. Removes beneficiary via UI, issues DELETE request, and updates capacity and list state', async ({
    authenticatedUser,
  }) => {
    const { page, beneficiariesPage, beneficiariesApi } = authenticatedUser;

    // Seed 1 beneficiary via API setup
    const targetBeneficiary = generateTestBeneficiaryData({
      name: 'ToDelete Beneficiary',
      currency: 'EUR',
      accountNumber: 'FR7630006000011234567890189',
      bankName: 'BNP Paribas',
    });

    const createRes = await beneficiariesApi.createBeneficiary(targetBeneficiary);
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();

    // Navigate to beneficiaries dashboard
    await beneficiariesPage.goto();

    // Verify card is visible
    const card = beneficiariesPage.getCardByName(targetBeneficiary.name);
    await expect(card).toBeVisible();
    await expect(beneficiariesPage.capacityText).toHaveText('1 of 3');

    // Verify Remove button exists and is active
    const removeButton = beneficiariesPage.getRemoveButtonFor(targetBeneficiary.name);
    await expect(removeButton).toBeVisible();
    await expect(removeButton).toBeEnabled();

    // Intercept DELETE /beneficiaries/:id
    const deleteResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/beneficiaries/${created.id}`) &&
        res.request().method() === 'DELETE'
    );

    // Trigger delete action
    await removeButton.click();

    // Verify DELETE request succeeded
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status()).toBe(200);

    // Verify card is removed from the UI
    await expect(card).toBeHidden();

    // Verify capacity counter resets to 0 of 3
    await expect(beneficiariesPage.capacityText).toHaveText('0 of 3');

    // Verify empty state reappears
    await expect(beneficiariesPage.emptyStateMessage).toBeVisible();

    // Verify Add Beneficiary card is available again
    await expect(beneficiariesPage.addBeneficiaryCard).toBeVisible();

    // Independently verify backend state via GET /beneficiaries API
    const listRes = await beneficiariesApi.getMyBeneficiaries();
    expect(listRes.status()).toBe(200);
    const remainingList = await listRes.json();
    expect(remainingList).toHaveLength(0);
    const found = remainingList.find((b: { id: string }) => b.id === created.id);
    expect(found).toBeUndefined();
  });
});

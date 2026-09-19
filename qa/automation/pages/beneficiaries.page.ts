import { Page, Locator } from '@playwright/test';

export interface BankBeneficiaryFormData {
  name: string;
  currency?: string;
  accountNumber: string;
  bankName?: string;
  bankCode?: string;
}

export interface UpiBeneficiaryFormData {
  name: string;
  currency?: string;
  upiId: string;
}

/**
 * Page Object Model for WrightPay Beneficiaries Page (/dashboard/beneficiaries).
 *
 * Accessibility Note:
 * The production form in BeneficiariesPage lacks explicit `htmlFor` / `id` associations
 * between `<label>` and `<input>`/`<select>` elements.
 * Following QA rules without modifying production components, stable user-facing locators
 * (`getByPlaceholder`, scoped label containers, and `getByRole`) are utilized.
 */
export class BeneficiariesPage {
  readonly page: Page;

  // Page Header & Capacity
  readonly heading: Locator;
  readonly subheading: Locator;
  readonly capacityText: Locator;
  readonly capacityPercentage: Locator;
  readonly maxCapacityBanner: Locator;
  readonly pageErrorBanner: Locator;

  // Empty State & Add Beneficiary Prompt
  readonly emptyStateMessage: Locator;
  readonly addBeneficiaryCard: Locator;
  readonly addBeneficiaryButton: Locator;

  // Modal Container & Controls
  readonly modal: Locator;
  readonly modalHeading: Locator;
  readonly modalCloseButton: Locator;
  readonly modalCancelButton: Locator;
  readonly modalSubmitButton: Locator;
  readonly modalErrorBanner: Locator;

  // Modal Form Inputs
  readonly nameInput: Locator;
  readonly currencySelect: Locator;
  readonly payoutMethodSelect: Locator;
  readonly accountNumberInput: Locator;
  readonly upiIdInput: Locator;
  readonly bankNameInput: Locator;
  readonly bankCodeInput: Locator;

  // Beneficiaries List
  readonly beneficiaryCardsContainer: Locator;
  readonly beneficiaryCards: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header & Capacity
    this.heading = page.getByRole('heading', { level: 1, name: 'Beneficiaries' });
    this.subheading = page.getByText(/You can save up to 3 beneficiaries/i);
    this.capacityText = page.getByText(/\d+ of 3/);
    this.capacityPercentage = page.getByText(/\d+%/).first();
    this.maxCapacityBanner = page.getByText(
      'You have reached the maximum of 3 beneficiaries. Remove one to add another.'
    );
    this.pageErrorBanner = page.locator('div.bg-red-50').filter({ hasText: /Failed/i });

    // Empty State & Add Card
    this.emptyStateMessage = page.getByText(
      'No beneficiaries saved yet. Click below to add your first beneficiary.'
    );
    this.addBeneficiaryCard = page
      .getByRole('heading', { level: 3, name: 'Add a Beneficiary' })
      .locator('..');
    this.addBeneficiaryButton = page.getByRole('button', { name: 'Add Beneficiary' });

    // Modal
    this.modal = page.locator('div.fixed.inset-0');
    this.modalHeading = this.modal.getByRole('heading', { level: 2, name: 'Add New Beneficiary' });
    this.modalCloseButton = this.modal.getByRole('button', { name: '✕' });
    this.modalCancelButton = this.modal.getByRole('button', { name: 'Cancel' });
    this.modalSubmitButton = this.modal.getByRole('button', { name: 'Save Beneficiary' });
    this.modalErrorBanner = this.modal
      .locator('div')
      .filter({ hasText: /Please|Failed|error/i })
      .first();

    // Form inputs (accessible placeholder & label-scoped combinator)
    this.nameInput = this.modal.getByPlaceholder('e.g. Fatima Al-Zahra');
    this.currencySelect = this.modal.locator('label:has-text("Currency *") + select');
    this.payoutMethodSelect = this.modal.locator('label:has-text("Payout Method *") + select');
    this.accountNumberInput = this.modal.getByPlaceholder('e.g. AE070330000000000000000');
    this.upiIdInput = this.modal.getByPlaceholder('username@okaxis');
    this.bankNameInput = this.modal.getByPlaceholder('e.g. Emirates NBD');
    this.bankCodeInput = this.modal.getByPlaceholder('e.g. EBILAEAD');

    // Cards list
    this.beneficiaryCardsContainer = page.locator('div.space-y-4');
    this.beneficiaryCards = page
      .locator('div.space-y-4 > div')
      .filter({ has: page.getByRole('heading', { level: 3 }) });
  }

  /**
   * Navigate directly to /dashboard/beneficiaries
   */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard/beneficiaries');
  }

  /**
   * Click the primary "Add Beneficiary" button to open modal
   */
  async openModal(): Promise<void> {
    await this.addBeneficiaryButton.click();
  }

  /**
   * Close modal using the top-right ✕ button
   */
  async closeModalViaCloseButton(): Promise<void> {
    await this.modalCloseButton.click();
  }

  /**
   * Close modal using the bottom "Cancel" button
   */
  async closeModalViaCancelButton(): Promise<void> {
    await this.modalCancelButton.click();
  }

  /**
   * Fill out the modal form for a Bank Account payout beneficiary
   */
  async fillBankBeneficiaryForm(data: BankBeneficiaryFormData): Promise<void> {
    await this.nameInput.fill(data.name);
    if (data.currency) {
      await this.currencySelect.selectOption(data.currency);
    }
    await this.payoutMethodSelect.selectOption('bank_account');
    await this.accountNumberInput.fill(data.accountNumber);
    if (data.bankName) {
      await this.bankNameInput.fill(data.bankName);
    }
    if (data.bankCode) {
      await this.bankCodeInput.fill(data.bankCode);
    }
  }

  /**
   * Fill out the modal form for a UPI payout beneficiary
   */
  async fillUpiBeneficiaryForm(data: UpiBeneficiaryFormData): Promise<void> {
    await this.nameInput.fill(data.name);
    // UPI requires INR currency
    await this.currencySelect.selectOption(data.currency || 'INR');
    await this.payoutMethodSelect.selectOption('upi');
    await this.upiIdInput.fill(data.upiId);
  }

  /**
   * Click "Save Beneficiary" to submit modal form
   */
  async submitForm(): Promise<void> {
    await this.modalSubmitButton.click();
  }

  /**
   * Locate a specific beneficiary card by recipient name
   */
  getCardByName(name: string): Locator {
    return this.page
      .locator('div.space-y-4 > div')
      .filter({ has: this.page.getByRole('heading', { level: 3, name }) });
  }

  /**
   * Locate the Remove button for a specific beneficiary
   */
  getRemoveButtonFor(name: string): Locator {
    return this.getCardByName(name).getByRole('button', { name: 'Remove' });
  }

  /**
   * Locate the disabled Edit button for a specific beneficiary
   */
  getEditButtonFor(name: string): Locator {
    return this.getCardByName(name).getByRole('button', { name: 'Edit' });
  }

  /**
   * Locate the Send Money link for a specific beneficiary
   */
  getSendMoneyLinkFor(name: string): Locator {
    return this.getCardByName(name).getByRole('link', {
      name: new RegExp(`Send Money to ${name}`, 'i'),
    });
  }
}

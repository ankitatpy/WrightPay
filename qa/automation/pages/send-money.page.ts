import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for WrightPay Send Money Workflow (/dashboard/send-money).
 *
 * Encapsulates the multi-step transfer wizard:
 * 1. Beneficiary selection
 * 2. Source wallet selection
 * 3. Amount input
 * 4. Destination currency & live FX quote
 * 5. Review & confirmation
 * 6. Asynchronous completion / status polling
 */
export class SendMoneyPage {
  readonly page: Page;

  // Page Header
  readonly heading: Locator;
  readonly subheading: Locator;
  readonly progressStepText: Locator;

  // Step 1: Beneficiary
  readonly beneficiaryHeading: Locator;
  readonly emptyBeneficiariesMessage: Locator;
  readonly addBeneficiaryLink: Locator;
  readonly beneficiaryButtons: Locator;

  // Step 2: Source Wallet
  readonly sourceWalletHeading: Locator;
  readonly sourceWalletCard: Locator;

  // Step 3: Enter Amount
  readonly amountHeading: Locator;
  readonly amountInput: Locator;
  readonly amountSummaryAmount: Locator;
  readonly amountSummaryFee: Locator;
  readonly amountSummaryTotal: Locator;

  // Step 4: Destination Currency
  readonly destCurrencyHeading: Locator;
  readonly destCurrencySelect: Locator;
  readonly exchangeRateBox: Locator;
  readonly exchangeRateValue: Locator;

  // Step 5: Review
  readonly reviewHeading: Locator;
  readonly reviewDetailsContainer: Locator;
  readonly reviewErrorMessage: Locator;
  readonly reviewRecipientReceives: Locator;

  // Common Wizard Navigation Buttons
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly confirmTransferButton: Locator;

  // Step 6: Complete / Status Screen
  readonly completeHeading: Locator;
  readonly referenceText: Locator;
  readonly statusText: Locator;
  readonly failureReasonText: Locator;
  readonly viewInTransactionsLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header & Progress
    this.heading = page.getByRole('heading', { level: 1, name: 'Send Money' });
    this.subheading = page.getByText('Transfer funds to your beneficiaries');
    this.progressStepText = page.getByText(/Step \d+ of 5/);

    // Step 1: Beneficiary
    this.beneficiaryHeading = page.getByRole('heading', { level: 2, name: 'Select Beneficiary' });
    this.emptyBeneficiariesMessage = page.getByText('No beneficiaries saved yet.');
    this.addBeneficiaryLink = page.getByRole('link', { name: 'Add a beneficiary first' });
    this.beneficiaryButtons = page.locator('div.space-y-3 > button');

    // Step 2: Source Wallet
    this.sourceWalletHeading = page.getByRole('heading', {
      level: 2,
      name: 'Select Source Wallet',
    });
    this.sourceWalletCard = page.locator('div.space-y-3 > div').filter({ hasText: /Wallet/i });

    // Step 3: Amount
    this.amountHeading = page.getByRole('heading', { level: 2, name: 'Enter Amount' });
    this.amountInput = page.getByPlaceholder('0.00');
    this.amountSummaryAmount = page.locator('div.space-y-2').getByText('Amount:');
    this.amountSummaryFee = page.locator('div.space-y-2').getByText('WrightPay Fixed Fee:');
    this.amountSummaryTotal = page.locator('div.space-y-2').getByText('Total Debit:');

    // Step 4: Destination Currency
    this.destCurrencyHeading = page.getByRole('heading', {
      level: 2,
      name: 'Select Destination Currency',
    });
    this.destCurrencySelect = page.locator('div:has(> label:has-text("Convert to")) select');
    this.exchangeRateBox = page.getByText('Exchange Rate (Live)').locator('..');
    this.exchangeRateValue = this.exchangeRateBox.locator('div.text-2xl');

    // Step 5: Review
    this.reviewHeading = page.getByRole('heading', { level: 2, name: 'Review Transfer' });
    this.reviewDetailsContainer = page.locator('div.space-y-4.bg-slate-50, div.space-y-4.bg-slate-800\\/50');
    this.reviewErrorMessage = page.locator('div.bg-red-50, div.text-red-700').filter({ hasText: /Insufficient|failed|error/i });
    this.reviewRecipientReceives = page.getByText('Recipient receives approximately:');

    // Wizard Controls
    this.nextButton = page.getByRole('button', { name: 'Next', exact: true });
    this.backButton = page.getByRole('button', { name: 'Back', exact: true });
    this.confirmTransferButton = page.getByRole('button', {
      name: /Confirm Transfer|Submitting Transfer/i,
    });

    // Step 6: Complete
    this.completeHeading = page.getByRole('heading', { level: 2 }).filter({
      hasText: /Transfer Completed|Transfer Failed|Processing Transfer/,
    });
    this.referenceText = page.locator('p:has-text("Reference:") span');
    this.statusText = page.locator('span:text-is("Status:") + span');
    this.failureReasonText = page.getByText(/Reason:/);
    this.viewInTransactionsLink = page.getByRole('link', { name: 'View in Transactions' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/send-money');
  }

  getBeneficiaryButton(name: string): Locator {
    return this.beneficiaryButtons.filter({ hasText: name });
  }

  async selectBeneficiary(name: string): Promise<void> {
    await this.getBeneficiaryButton(name).click();
  }

  async enterAmount(val: string | number): Promise<void> {
    await this.amountInput.fill(String(val));
  }

  async selectDestinationCurrency(currency: string): Promise<void> {
    await this.destCurrencySelect.selectOption(currency);
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  async clickConfirmTransfer(): Promise<void> {
    await this.confirmTransferButton.click();
  }
}

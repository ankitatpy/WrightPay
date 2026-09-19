import { Page, Locator } from '@playwright/test';

export interface AddCardFormData {
  cardholderName: string;
  type?: 'debit' | 'credit';
  cardNumber: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv: string;
}

/**
 * Page Object Model for WrightPay Cards Page (/dashboard/cards).
 *
 * Accessibility Note:
 * Production form inputs lack explicit `id` and `<label htmlFor="...">` associations.
 * In accordance with QA testing constraints, resilient user-facing locators
 * (`getByPlaceholder`, label-sibling combinators, and `getByRole`) are utilized.
 */
export class CardsPage {
  readonly page: Page;

  // Page Header & Empty State
  readonly heading: Locator;
  readonly subheading: Locator;
  readonly emptyState: Locator;
  readonly pageErrorBanner: Locator;

  // Add Card Trigger Card
  readonly addCardTriggerCard: Locator;
  readonly addCardButton: Locator;

  // Add Card Modal
  readonly addModal: Locator;
  readonly modalHeading: Locator;
  readonly modalCloseButton: Locator;
  readonly modalCancelButton: Locator;
  readonly modalSubmitButton: Locator;
  readonly modalErrorBanner: Locator;

  // Add Card Form Fields
  readonly cardholderNameInput: Locator;
  readonly cardTypeSelect: Locator;
  readonly cardNumberInput: Locator;
  readonly expiryMonthSelect: Locator;
  readonly expiryYearSelect: Locator;
  readonly cvvInput: Locator;

  // Card Management Section
  readonly managementHeading: Locator;
  readonly managementCards: Locator;
  readonly visualCards: Locator;

  // Deactivate Confirmation Modal
  readonly deactivateModal: Locator;
  readonly deactivateHeading: Locator;
  readonly deactivateMessage: Locator;
  readonly deactivateCancelButton: Locator;
  readonly deactivateConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page Header & Empty State
    this.heading = page.getByRole('heading', { level: 1, name: 'Cards' });
    this.subheading = page.getByText('Manage your payment cards');
    this.emptyState = page.getByText('No payment cards saved yet. Click below to add a card.');
    this.pageErrorBanner = page.locator('div.bg-red-50').filter({ hasText: /Failed/i });

    // Add Card Trigger
    this.addCardTriggerCard = page
      .getByRole('heading', { level: 3, name: 'Add a New Card' })
      .locator('..');
    this.addCardButton = this.addCardTriggerCard.getByRole('button', { name: 'Add Card' });

    // Add Card Modal
    this.addModal = page
      .locator('div.fixed.inset-0')
      .filter({ has: page.getByRole('heading', { level: 2, name: 'Add Payment Card' }) });
    this.modalHeading = this.addModal.getByRole('heading', { level: 2, name: 'Add Payment Card' });
    this.modalCloseButton = this.addModal.getByRole('button', { name: '✕' });
    this.modalCancelButton = this.addModal.getByRole('button', { name: 'Cancel' });
    this.modalSubmitButton = this.addModal.getByRole('button', { name: 'Add Card' });
    this.modalErrorBanner = this.addModal.locator('div.bg-red-50, div.border-red-200');

    // Form inputs (accessible placeholder & label-sibling scoping)
    this.cardholderNameInput = this.addModal.getByPlaceholder('e.g. Tariq Al-Mansoor');
    this.cardTypeSelect = this.addModal.locator('label:has-text("Card Type *") + select');
    this.cardNumberInput = this.addModal.getByPlaceholder('4532 0158 9234 5678');
    this.expiryMonthSelect = this.addModal
      .locator('label:has-text("Expiry Date *") + div select')
      .first();
    this.expiryYearSelect = this.addModal
      .locator('label:has-text("Expiry Date *") + div select')
      .nth(1);
    this.cvvInput = this.addModal.getByPlaceholder('123');

    // Management & Visual Collections
    this.managementHeading = page.getByRole('heading', { level: 2, name: 'Card Management' });
    this.managementCards = page.locator('div.mt-8.space-y-4 > div[class*="rounded-lg"]');
    this.visualCards = page.locator('div.grid.grid-cols-1.md\\:grid-cols-2.gap-6 > div[class*="rounded-xl"]');

    // Deactivate Modal
    this.deactivateModal = page
      .locator('div.fixed.inset-0')
      .filter({ has: page.getByRole('heading', { level: 2, name: 'Deactivate Card' }) });
    this.deactivateHeading = this.deactivateModal.getByRole('heading', {
      level: 2,
      name: 'Deactivate Card',
    });
    this.deactivateMessage = this.deactivateModal.locator('p');
    this.deactivateCancelButton = this.deactivateModal.getByRole('button', { name: 'Cancel' });
    this.deactivateConfirmButton = this.deactivateModal.getByRole('button', {
      name: 'Confirm Deactivate',
    });
  }

  /**
   * Navigate directly to /dashboard/cards
   */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard/cards');
  }

  /**
   * Click Add Card button on the prompt card
   */
  async openAddModal(): Promise<void> {
    await this.addCardButton.click();
  }

  /**
   * Close Add Card modal via Cancel button
   */
  async closeAddModalViaCancelButton(): Promise<void> {
    await this.modalCancelButton.click();
  }

  /**
   * Close Add Card modal via top-right ✕ button
   */
  async closeAddModalViaCloseButton(): Promise<void> {
    await this.modalCloseButton.click();
  }

  /**
   * Fill out the Add Card form
   */
  async fillAddCardForm(data: AddCardFormData): Promise<void> {
    await this.cardholderNameInput.fill(data.cardholderName);
    if (data.type) {
      await this.cardTypeSelect.selectOption(data.type);
    }
    await this.cardNumberInput.fill(data.cardNumber);
    if (data.expiryMonth) {
      await this.expiryMonthSelect.selectOption(data.expiryMonth);
    }
    if (data.expiryYear) {
      await this.expiryYearSelect.selectOption(data.expiryYear);
    }
    await this.cvvInput.fill(data.cvv);
  }

  /**
   * Submit Add Card modal form
   */
  async submitAddCardForm(): Promise<void> {
    await this.modalSubmitButton.click();
  }

  /**
   * Locate Card Management entry by last 4 digits
   */
  getManagementCard(lastFour: string): Locator {
    return this.page
      .locator('div.mt-8.space-y-4 > div')
      .filter({ hasText: `ending in ${lastFour}` });
  }

  /**
   * Locate visual card widget by last 4 digits
   */
  getVisualCard(lastFour: string): Locator {
    return this.page
      .locator('div.grid.grid-cols-1.md\\:grid-cols-2.gap-6 > div')
      .filter({ hasText: lastFour });
  }

  /**
   * Locate Freeze button for a card
   */
  getFreezeButton(lastFour: string): Locator {
    return this.getManagementCard(lastFour).getByRole('button', { name: /Freeze Card/i });
  }

  /**
   * Locate Unfreeze button for a card
   */
  getUnfreezeButton(lastFour: string): Locator {
    return this.getManagementCard(lastFour).getByRole('button', { name: /Unfreeze Card/i });
  }

  /**
   * Locate Deactivate trigger button for a card
   */
  getDeactivateButton(lastFour: string): Locator {
    return this.getManagementCard(lastFour).getByRole('button', { name: 'Deactivate' });
  }

  /**
   * Locate Remove button for a card
   */
  getRemoveButton(lastFour: string): Locator {
    return this.getManagementCard(lastFour).getByRole('button', { name: 'Remove' });
  }

  /**
   * Locate status badge within a card management item
   */
  getStatusBadge(lastFour: string): Locator {
    return this.getManagementCard(lastFour)
      .locator('div')
      .filter({ hasText: /^(Active|Frozen|Deactivated|Declined)$/ })
      .first();
  }

  /**
   * Confirm card deactivation in confirmation modal
   */
  async confirmDeactivation(): Promise<void> {
    await this.deactivateConfirmButton.click();
  }

  /**
   * Cancel card deactivation in confirmation modal
   */
  async cancelDeactivation(): Promise<void> {
    await this.deactivateCancelButton.click();
  }
}

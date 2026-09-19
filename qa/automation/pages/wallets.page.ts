import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for WrightPay Wallets Page (/dashboard/wallets).
 */
export class WalletsPage {
  readonly page: Page;

  // Header
  readonly heading: Locator;
  readonly subheading: Locator;

  // Error Banner
  readonly errorBanner: Locator;
  readonly retryButton: Locator;

  // Wallet Cards Grid
  readonly walletCards: Locator;
  readonly primaryWalletCard: Locator;
  readonly primaryBalanceValue: Locator;
  readonly primaryCurrencyCode: Locator;
  readonly primaryFundingBadge: Locator;
  readonly equivalentCards: Locator;

  // Coming Soon Section
  readonly comingSoonSection: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { level: 1, name: 'Your Wallets' });
    this.subheading = page.getByText('Manage your multi-currency wallets');
    this.errorBanner = page.locator('div.bg-red-50');
    this.retryButton = page.getByRole('button', { name: 'Retry' });

    this.walletCards = page.locator('div.grid > div');
    this.primaryWalletCard = page.locator('div.grid > div').filter({ hasText: 'Primary Balance' });
    this.primaryBalanceValue = this.primaryWalletCard.locator('p.text-3xl');
    this.primaryCurrencyCode = this.primaryWalletCard.locator('div.text-2xl');
    this.primaryFundingBadge = page.getByText('Primary funding currency');

    this.equivalentCards = page.locator('div.grid > div').filter({ hasText: 'Estimated Equivalent' });
    this.comingSoonSection = page.getByRole('heading', { level: 3, name: 'Coming Soon' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/wallets');
  }

  getCardByCurrency(currency: string): Locator {
    return this.walletCards.filter({ hasText: currency });
  }

  async getCardBalance(currency: string): Promise<string> {
    const card = this.getCardByCurrency(currency);
    return card.locator('p.text-3xl').innerText();
  }
}

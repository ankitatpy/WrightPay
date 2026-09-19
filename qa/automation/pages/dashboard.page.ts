import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly headerGreeting: Locator;
  readonly headerEmail: Locator;
  readonly signOutButton: Locator;
  readonly sidebar: Locator;
  readonly sidebarOverviewLink: Locator;
  readonly sidebarWalletsLink: Locator;
  readonly sidebarSendMoneyLink: Locator;
  readonly sidebarTransactionsLink: Locator;
  readonly sidebarBeneficiariesLink: Locator;
  readonly sidebarCardsLink: Locator;
  readonly sidebarProfileLink: Locator;
  readonly exchangeRateBanner: Locator;
  readonly primaryBalance: Locator;
  readonly currencyEquivalentsHeading: Locator;
  readonly currencyCards: Locator;
  readonly recentTransactionsHeading: Locator;
  readonly recentTransactionsRows: Locator;
  readonly emptyTransactionsMessage: Locator;
  readonly walletErrorBanner: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.headerGreeting = page.getByRole('heading', { level: 2, name: /Welcome back/i });
    this.headerEmail = page.locator('header p');
    this.signOutButton = page.getByRole('button', { name: 'Sign out' });
    this.sidebar = page.locator('aside');
    this.sidebarOverviewLink = this.sidebar.getByRole('link', { name: 'Overview' });
    this.sidebarWalletsLink = this.sidebar.getByRole('link', { name: 'Wallets' });
    this.sidebarSendMoneyLink = this.sidebar.getByRole('link', { name: 'Send Money' });
    this.sidebarTransactionsLink = this.sidebar.getByRole('link', { name: 'Transactions' });
    this.sidebarBeneficiariesLink = this.sidebar.getByRole('link', { name: 'Beneficiaries' });
    this.sidebarCardsLink = this.sidebar.getByRole('link', { name: 'Cards' });
    this.sidebarProfileLink = this.sidebar.getByRole('link', { name: 'Profile' });
    this.exchangeRateBanner = page.locator('text=Live rates');
    this.primaryBalance = page.locator('main').getByRole('heading', { level: 1 });
    this.currencyEquivalentsHeading = page.getByRole('heading', { name: 'Currency Equivalents' });
    this.currencyCards = page.locator('div.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3 > div');
    this.recentTransactionsHeading = page.getByRole('heading', { name: 'Recent Transactions' });
    this.recentTransactionsRows = page.locator('table tbody tr');
    this.emptyTransactionsMessage = page.getByText('No recent transactions');
    this.walletErrorBanner = page.locator('div.bg-red-50');
    this.retryButton = page.getByRole('button', { name: 'Retry' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  async getStoredToken(): Promise<string | null> {
    return this.page.evaluate(() => localStorage.getItem('wrightpay_access_token'));
  }
}

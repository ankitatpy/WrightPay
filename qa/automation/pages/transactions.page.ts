import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for WrightPay Transactions Page (/dashboard/transactions).
 */
export class TransactionsPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly subheading: Locator;
  readonly tableRows: Locator;
  readonly searchInput: Locator;
  readonly emptyTableMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Transactions' });
    this.subheading = page.getByText('View and manage all your transactions');
    this.tableRows = page.locator('table tbody tr');
    this.searchInput = page.getByPlaceholder('WP-20260816-001');
    this.emptyTableMessage = page.getByText('No transactions found');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/transactions');
  }

  getRowByReference(ref: string): Locator {
    return this.tableRows.filter({ hasText: ref });
  }

  async searchByReference(ref: string): Promise<void> {
    await this.searchInput.fill(ref);
  }
}

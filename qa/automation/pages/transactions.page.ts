import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for WrightPay Transactions Page (/dashboard/transactions).
 */
export class TransactionsPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly subheading: Locator;
  readonly tableRows: Locator;
  readonly tableHeaders: Locator;
  readonly searchInput: Locator;
  readonly emptyTableMessage: Locator;
  readonly errorAlert: Locator;
  readonly retryButton: Locator;

  // Status Filter Buttons
  readonly filterAllButton: Locator;
  readonly filterCompletedButton: Locator;
  readonly filterPendingButton: Locator;
  readonly filterFailedButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'Transactions' });
    this.subheading = page.getByText('View and manage all your transactions');
    this.tableRows = page.locator('table tbody tr');
    this.tableHeaders = page.locator('table thead th');
    this.searchInput = page.getByPlaceholder('WP-20260816-001');
    this.emptyTableMessage = page.getByText('No transactions found');
    this.errorAlert = page.locator('div.bg-red-50, div.text-red-700');
    this.retryButton = page.getByRole('button', { name: 'Retry' });

    this.filterAllButton = page.getByRole('button', { name: 'All', exact: true });
    this.filterCompletedButton = page.getByRole('button', { name: 'Completed', exact: true });
    this.filterPendingButton = page.getByRole('button', { name: 'Pending', exact: true });
    this.filterFailedButton = page.getByRole('button', { name: 'Failed', exact: true });
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

  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  async filterByStatus(status: 'all' | 'completed' | 'pending' | 'failed'): Promise<void> {
    switch (status) {
      case 'all':
        await this.filterAllButton.click();
        break;
      case 'completed':
        await this.filterCompletedButton.click();
        break;
      case 'pending':
        await this.filterPendingButton.click();
        break;
      case 'failed':
        await this.filterFailedButton.click();
        break;
    }
  }
}

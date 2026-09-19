import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly submitButton: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly errorBanner: Locator;
  readonly signupLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: 'WrightPay' });
    this.emailInput = page.getByLabel('Email address');
    this.passwordInput = page.getByLabel('Password');
    this.rememberMeCheckbox = page.locator('input[name="rememberMe"]');
    this.submitButton = page.getByRole('button', { name: /Sign in/i });
    this.emailError = page.getByText('Email is required');
    this.passwordError = page.getByText('Password is required');
    this.errorBanner = page.locator('div.bg-red-50 span');
    this.signupLink = page.getByRole('link', { name: 'Create one' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getStoredToken(): Promise<string | null> {
    return this.page.evaluate(() => localStorage.getItem('wrightpay_access_token'));
  }
}

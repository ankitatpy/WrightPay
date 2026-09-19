import { Page, Locator } from '@playwright/test';

export class SignupPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly passwordLengthError: Locator;
  readonly passwordMismatchError: Locator;
  readonly emailError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.getByLabel('First name');
    this.lastNameInput = page.getByLabel('Last name');
    this.emailInput = page.getByLabel('Email address');
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.confirmPasswordInput = page.getByLabel('Confirm password');
    this.termsCheckbox = page.locator('input[name="agreeTerms"]');
    this.submitButton = page.getByRole('button', { name: /Create Account/i });
    this.passwordLengthError = page.getByText('Password must be at least 8 characters');
    this.passwordMismatchError = page.getByText('Passwords do not match');
    this.emailError = page.locator('input#email + p');
  }

  async goto(): Promise<void> {
    await this.page.goto('/signup');
  }
}

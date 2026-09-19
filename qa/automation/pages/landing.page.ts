import { Page, Locator } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly signInNavButton: Locator;
  readonly getStartedNavButton: Locator;
  readonly createAccountHeroButton: Locator;
  readonly signInHeroButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Cross-border payments made simple' });
    this.signInNavButton = page.locator('nav').getByRole('link', { name: 'Sign In' });
    this.getStartedNavButton = page.locator('nav').getByRole('link', { name: 'Get Started' });
    this.createAccountHeroButton = page.locator('section').getByRole('link', { name: 'Create Account' });
    this.signInHeroButton = page.locator('section').getByRole('link', { name: 'Sign In' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }
}

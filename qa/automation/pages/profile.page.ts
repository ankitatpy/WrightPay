import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for WrightPay Profile Page (/dashboard/profile).
 */
export class ProfilePage {
  readonly page: Page;

  // Header
  readonly heading: Locator;
  readonly subheading: Locator;

  // Profile Header Card
  readonly avatarInitial: Locator;
  readonly userNameHeading: Locator;
  readonly userEmailText: Locator;
  readonly uploadPhotoButton: Locator;

  // Appearance Card
  readonly appearanceHeading: Locator;
  readonly darkModeSwitch: Locator;

  // Personal Information Card
  readonly personalInfoHeading: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly defaultCurrencySelect: Locator;
  readonly saveChangesButton: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;

  // Security Card
  readonly securityHeading: Locator;
  readonly passwordChangeButton: Locator;
  readonly twoFactorEnableButton: Locator;

  // Verification Status (KYC) Card
  readonly kycHeading: Locator;
  readonly kycStatusText: Locator;

  // Account Actions Card
  readonly accountHeading: Locator;
  readonly downloadDataButton: Locator;
  readonly deactivateAccountButton: Locator;

  // Global Header Sign out
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header
    this.heading = page.getByRole('heading', { level: 1, name: 'Profile' });
    this.subheading = page.getByText('Manage your account information');

    // Profile Card
    this.avatarInitial = page.locator('div.w-16.h-16 span');
    this.userNameHeading = page.locator('div.flex.items-center.gap-6 h2');
    this.userEmailText = page.locator('div.flex.items-center.gap-6 p');
    this.uploadPhotoButton = page.getByRole('button', { name: 'Upload Photo' });

    // Appearance Card
    this.appearanceHeading = page.getByRole('heading', { level: 3, name: 'Appearance' });
    this.darkModeSwitch = page.getByRole('switch', { name: 'Toggle dark mode' });

    // Personal Information Form
    this.personalInfoHeading = page.getByRole('heading', { level: 3, name: 'Personal Information' });
    this.firstNameInput = page.locator('div:has(> label:has-text("First Name")) input');
    this.lastNameInput = page.locator('div:has(> label:has-text("Last Name")) input');
    this.emailInput = page.locator('div:has(> label:has-text("Email")) input');
    this.defaultCurrencySelect = page.locator('div:has(> label:has-text("Default Currency")) select');
    this.saveChangesButton = page.getByRole('button', { name: /Save Changes|Saving\.\.\./ });
    this.successAlert = page.getByText('Profile updated successfully.');
    this.errorAlert = page.locator('form div.bg-red-50, form div.text-red-700');

    // Security
    this.securityHeading = page.getByRole('heading', { level: 3, name: 'Security' });
    this.passwordChangeButton = page.getByRole('button', { name: 'Change' });
    this.twoFactorEnableButton = page.getByRole('button', { name: 'Enable' });

    // KYC
    this.kycHeading = page.getByRole('heading', { level: 3, name: 'Verification Status' });
    this.kycStatusText = page.getByText('Your account is verified');

    // Account Actions
    this.accountHeading = page.getByRole('heading', { level: 3, name: 'Account' });
    this.downloadDataButton = page.getByRole('button', { name: 'Download Account Data' });
    this.deactivateAccountButton = page.getByRole('button', { name: 'Deactivate Account' });

    // Global Header Sign out
    this.signOutButton = page.getByRole('button', { name: 'Sign out' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard/profile');
  }

  async updateName(first: string, last: string): Promise<void> {
    await this.firstNameInput.fill(first);
    await this.lastNameInput.fill(last);
  }

  async selectDefaultCurrency(currency: string): Promise<void> {
    await this.defaultCurrencySelect.selectOption(currency);
  }

  async clickSaveChanges(): Promise<void> {
    await this.saveChangesButton.click();
  }

  async signOut(): Promise<void> {
    await this.signOutButton.click();
  }
}

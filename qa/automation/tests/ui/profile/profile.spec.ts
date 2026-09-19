import { test, expect } from '../../../fixtures/ui.fixtures';

test.describe('Profile UI Suite — Phase 2D', () => {
  // =========================================================================
  // P1. PROFILE DATA LOAD
  // =========================================================================
  test('1. Loads and displays authenticated user profile matching backend GET /users/me', async ({
    authenticatedUser,
  }) => {
    const { profilePage, usersApi, user } = authenticatedUser;

    await profilePage.goto();

    // Verify main headings
    await expect(profilePage.heading).toBeVisible();
    await expect(profilePage.subheading).toBeVisible();

    // Verify profile header card
    const firstInitial = user.name.charAt(0).toUpperCase();
    await expect(profilePage.avatarInitial).toHaveText(firstInitial);
    await expect(profilePage.userNameHeading).toHaveText(user.name);
    await expect(profilePage.userEmailText).toHaveText(user.email);
    await expect(profilePage.uploadPhotoButton).toBeVisible();

    // Verify Personal Information form fields
    const parts = user.name.trim().split(' ');
    const expectedFirst = parts[0] || '';
    const expectedLast = parts.slice(1).join(' ') || '';

    await expect(profilePage.firstNameInput).toHaveValue(expectedFirst);
    await expect(profilePage.lastNameInput).toHaveValue(expectedLast);
    await expect(profilePage.emailInput).toHaveValue(user.email);
    await expect(profilePage.emailInput).toBeDisabled();

    // Verify Default Currency select
    await expect(profilePage.defaultCurrencySelect).toHaveValue('EUR');

    // Authoritative backend cross-check via GET /users/me
    const apiRes = await usersApi.getMe();
    expect(apiRes.status()).toBe(200);
    const apiUser = await apiRes.json();
    expect(apiUser.email).toBe(user.email);
    expect(apiUser.name).toBe(user.name);
    expect(apiUser.defaultCurrency).toBe('EUR');
  });

  // =========================================================================
  // P2. PROFILE UPDATE
  // =========================================================================
  test('2. Updates user profile name and default currency via UI and verifies persistence through API and page reload', async ({
    authenticatedUser,
    page,
  }) => {
    const { profilePage, usersApi } = authenticatedUser;

    await profilePage.goto();

    // Update First Name, Last Name, and Default Currency
    await profilePage.updateName('Alexander', 'Hamilton');
    await profilePage.selectDefaultCurrency('GBP');

    // Listen for PATCH /users/me response
    const patchPromise = page.waitForResponse(
      (res) => res.url().includes('/users/me') && res.request().method() === 'PATCH'
    );

    await profilePage.clickSaveChanges();

    const patchRes = await patchPromise;
    expect(patchRes.status()).toBe(200);

    // Verify UI reflects success notification
    await expect(profilePage.successAlert).toBeVisible();
    await expect(profilePage.userNameHeading).toHaveText('Alexander Hamilton');

    // Independently verify persistence via GET /users/me
    const apiRes = await usersApi.getMe();
    expect(apiRes.status()).toBe(200);
    const updatedUser = await apiRes.json();
    expect(updatedUser.name).toBe('Alexander Hamilton');
    expect(updatedUser.defaultCurrency).toBe('GBP');

    // Reload the page and verify updated values remain persisted in UI
    await page.reload();
    await expect(profilePage.userNameHeading).toHaveText('Alexander Hamilton');
    await expect(profilePage.firstNameInput).toHaveValue('Alexander');
    await expect(profilePage.lastNameInput).toHaveValue('Hamilton');
    await expect(profilePage.defaultCurrencySelect).toHaveValue('GBP');
  });

  // =========================================================================
  // P3. INVALID / EMPTY PROFILE UPDATE RESILIENCE
  // =========================================================================
  test('3. Handles empty name inputs with fallback to existing identity without corrupting user profile', async ({
    authenticatedUser,
  }) => {
    const { profilePage, usersApi, user } = authenticatedUser;

    await profilePage.goto();

    // Clear First Name and Last Name
    await profilePage.firstNameInput.clear();
    await profilePage.lastNameInput.clear();

    await profilePage.clickSaveChanges();

    // Frontend fallback: if trimmed full name is empty, falls back to user.name
    await expect(profilePage.successAlert).toBeVisible();

    // Verify database profile still retains a valid, non-empty name
    const apiRes = await usersApi.getMe();
    expect(apiRes.status()).toBe(200);
    const currentUser = await apiRes.json();
    expect(currentUser.name).toBeTruthy();
    expect(currentUser.name).toBe(user.name);
  });

  // =========================================================================
  // P4. PROFILE SECURITY & SENSITIVE INFORMATION AUDIT
  // =========================================================================
  test('4. Audits profile UI for sensitive data exposure and confirms read-only security constraints', async ({
    authenticatedUser,
    page,
  }) => {
    const { profilePage, user } = authenticatedUser;

    await profilePage.goto();

    // Verify Email field is disabled and marked read-only to prevent unauthorized client-side alteration
    await expect(profilePage.emailInput).toBeDisabled();
    await expect(profilePage.emailInput).toHaveClass(/cursor-not-allowed/);

    // Verify no sensitive tokens or password hashes appear anywhere in the rendered HTML or body text
    const pageContent = await page.content();
    expect(pageContent).not.toContain(user.password);
    expect(pageContent).not.toContain('passwordHash');
    expect(pageContent).not.toContain('password_hash');

    // Security Section Verification: Password and 2FA cards display placeholders without exposing secrets
    await expect(profilePage.securityHeading).toBeVisible();
    await expect(page.getByText('Last changed 6 months ago')).toBeVisible();
    await expect(page.getByText('Status: Not enabled')).toBeVisible();

    // Document confirmed KYC UI limitation:
    // KYC status is statically hardcoded to "Your account is verified" in V1.
    await expect(profilePage.kycHeading).toBeVisible();
    await expect(profilePage.kycStatusText).toBeVisible();
  });

  // =========================================================================
  // P5. LOGOUT & ROUTE GUARD ENFORCEMENT
  // =========================================================================
  test('5. Executes user sign out from profile view, clears session token, and enforces protected route guard', async ({
    authenticatedUser,
    page,
  }) => {
    const { profilePage } = authenticatedUser;

    await profilePage.goto();

    // Verify token exists prior to logout
    const preToken = await page.evaluate(() =>
      window.localStorage.getItem('wrightpay_access_token')
    );
    expect(preToken).toBeTruthy();

    // Monitor the POST /auth/logout API call
    const logoutPromise = page.waitForResponse(
      (res) => res.url().includes('/auth/logout') && res.request().method() === 'POST'
    );

    // Click Sign out in global Header
    await profilePage.signOut();

    const logoutRes = await logoutPromise;
    expect(logoutRes.ok()).toBeTruthy();

    // Verify redirect to /login
    await expect(page).toHaveURL(/\/login$/);

    // Verify localStorage session token is cleared
    const postToken = await page.evaluate(() =>
      window.localStorage.getItem('wrightpay_access_token')
    );
    expect(postToken).toBeNull();

    // Verify protected route guard prevents unauthenticated access using a clean tab
    const freshPage = await page.context().newPage();
    await freshPage.goto('/dashboard/profile');
    await expect(freshPage).toHaveURL(/\/login$/);
    await expect(
      freshPage.getByRole('button', { name: /sign in/i })
    ).toBeVisible();
    await freshPage.close();
  });
});

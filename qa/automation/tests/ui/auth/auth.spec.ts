import { test, expect } from '../../../fixtures/ui.fixtures';

test.describe('Authentication Suite — Login, Signup, & Logout', () => {
  test('4. Empty login form displays validation errors', async ({ page, loginPage }) => {
    await loginPage.goto();

    // Trigger form submit without entering values
    await loginPage.submitButton.click();

    // Verify client-side required field error messages
    await expect(loginPage.emailError).toBeVisible();
    await expect(loginPage.emailError).toHaveText('Email is required');

    await expect(loginPage.passwordError).toBeVisible();
    await expect(loginPage.passwordError).toHaveText('Password is required');

    // Verify user remained on login page with no redirect
    await expect(page).toHaveURL(/\/login$/);
  });

  test('5. Invalid credentials display the expected error message', async ({ page, loginPage }) => {
    await loginPage.goto();

    // Submit non-existent credentials
    await loginPage.login('unregistered_qa_user@example.com', 'InvalidPassword123!');

    // Verify backend error response mapped to user-visible alert banner
    await expect(loginPage.errorBanner).toBeVisible();
    await expect(loginPage.errorBanner).toHaveText('Incorrect email or password.');

    // Ensure session was not created
    const token = await loginPage.getStoredToken();
    expect(token).toBeNull();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('6. Valid login: authenticates via UI, stores token, and redirects to /dashboard', async ({ page, loginPage, createTestUser }) => {
    // Provision fresh, isolated user in backend DB with email verified
    const user = await createTestUser();

    await loginPage.goto();

    // Exercise real login form interaction
    await loginPage.login(user.email, user.password);

    // Wait for successful redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard$/);

    // Verify token persisted in browser localStorage
    const storedToken = await loginPage.getStoredToken();
    expect(storedToken).toBeTruthy();
    expect(typeof storedToken).toBe('string');

    // Verify user profile hydrated on dashboard
    await expect(page.getByRole('heading', { level: 2, name: /Welcome back/i })).toContainText(user.name);
  });

  test('7. Signup validation: password shorter than 8 characters and password mismatch', async ({ page, signupPage }) => {
    await signupPage.goto();

    // Fill valid name and email
    await signupPage.firstNameInput.fill('Alex');
    await signupPage.lastNameInput.fill('Tester');
    await signupPage.emailInput.fill('alex.tester@example.com');

    // Scenario A: Password < 8 characters
    await signupPage.passwordInput.fill('Pass1!');
    await signupPage.confirmPasswordInput.fill('Pass1!');
    await signupPage.submitButton.click();

    await expect(signupPage.passwordLengthError).toBeVisible();
    await expect(signupPage.passwordLengthError).toHaveText('Password must be at least 8 characters');

    // Scenario B: Password mismatch
    await signupPage.passwordInput.fill('ValidPassword123!');
    await signupPage.confirmPasswordInput.fill('MismatchedPassword123!');
    await signupPage.submitButton.click();

    await expect(signupPage.passwordMismatchError).toBeVisible();
    await expect(signupPage.passwordMismatchError).toHaveText('Passwords do not match');

    // Ensure no registration navigation occurred
    await expect(page).toHaveURL(/\/signup$/);
  });

  test('8. Logout: API logout occurs, localStorage token is removed, user redirected to /login', async ({ authenticatedUser }) => {
    const { page, dashboardPage } = authenticatedUser;

    await dashboardPage.goto();
    await expect(dashboardPage.headerGreeting).toBeVisible();

    // Verify token is present before sign out
    const preLogoutToken = await dashboardPage.getStoredToken();
    expect(preLogoutToken).toBeTruthy();

    // Monitor the POST /auth/logout API call
    const logoutPromise = page.waitForResponse(
      (res) => res.url().includes('/auth/logout') && res.request().method() === 'POST',
    );

    // Click Sign out in header
    await dashboardPage.signOutButton.click();

    // Ensure backend acknowledged logout
    const logoutRes = await logoutPromise;
    expect(logoutRes.ok()).toBeTruthy();

    // Verify browser redirected to /login
    await expect(page).toHaveURL(/\/login$/);

    // Verify localStorage auth token was cleared
    const postLogoutToken = await dashboardPage.getStoredToken();
    expect(postLogoutToken).toBeNull();
  });
});

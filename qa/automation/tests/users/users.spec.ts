import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { UsersApi } from '../../api';

test.describe('Users Domain API Tests', () => {
  // ==========================================
  // 1. GET /users/me
  // ==========================================
  test.describe('GET /users/me', () => {
    test('successfully retrieves authenticated user profile with correct identity fields', async ({ authUser }) => {
      const response = await authUser.api.users.getMe();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toBeDefined();

      // Identity fields verification
      expect(body.id).toBe(authUser.user.id);
      expect(body.email).toBe(authUser.user.email);
      expect(body.name).toBe(authUser.user.name);
      expect(body.accountType).toBe('individual');
      expect(body.accountStatus).toBe('active');
      expect(body.defaultCurrency).toBe('EUR');
      expect(body.createdAt).toBeDefined();
      expect(typeof body.createdAt).toBe('string');

      // Security check: sensitive fields must not be exposed in the profile response
      expect(body.passwordHash).toBeUndefined();
      expect(body.password).toBeUndefined();
    });

    test('maintains strict user isolation across separate authenticated sessions', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A from fixture
      const responseA = await authUser.api.users.getMe();
      expect(responseA.status()).toBe(200);
      const profileA = await responseA.json();

      // Provision User B independently
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      const { userId: userIdB } = await signupB.json();

      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({
        email: testUserB.email,
        password: testUserB.password,
      });
      expect(loginB.status()).toBe(200);
      const { access_token: tokenB } = await loginB.json();

      // Create isolated request context for User B
      const contextB = await playwright.request.newContext({
        baseURL: responseA.url().replace(/\/users\/me.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const usersApiB = new UsersApi(contextB);
      const responseB = await usersApiB.getMe();
      expect(responseB.status()).toBe(200);
      const profileB = await responseB.json();

      // Verify User A receives User A's identity and User B receives User B's identity
      expect(profileA.id).toBe(authUser.user.id);
      expect(profileA.email).toBe(authUser.user.email);

      expect(profileB.id).toBe(userIdB);
      expect(profileB.email).toBe(testUserB.email.toLowerCase());

      // Assert complete identity isolation between users
      expect(profileA.id).not.toBe(profileB.id);
      expect(profileA.email).not.toBe(profileB.email);

      await contextB.dispose();
    });

    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('users/me');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: 'Bearer invalid.token.string',
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  // ==========================================
  // 2. PATCH /users/me
  // ==========================================
  test.describe('PATCH /users/me', () => {
    test('successfully updates user profile name and countryOfResidence', async ({ authUser }) => {
      const updatedName = 'Alex Mercer';
      const updatedCountry = 'Germany';

      const patchResponse = await authUser.api.users.updateMe({
        name: updatedName,
        countryOfResidence: updatedCountry,
      });

      expect(patchResponse.status()).toBe(200);
      const updatedProfile = await patchResponse.json();
      expect(updatedProfile.name).toBe(updatedName);
      expect(updatedProfile.countryOfResidence).toBe(updatedCountry);
      expect(updatedProfile.id).toBe(authUser.user.id);

      // Verify update is observable via subsequent GET /users/me
      const getResponse = await authUser.api.users.getMe();
      expect(getResponse.status()).toBe(200);
      const fetchedProfile = await getResponse.json();
      expect(fetchedProfile.name).toBe(updatedName);
      expect(fetchedProfile.countryOfResidence).toBe(updatedCountry);

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{ name: string; countryOfResidence: string }>(
        'SELECT name, "countryOfResidence" FROM users WHERE id = $1',
        [authUser.user.id],
      );
      expect(dbRow).not.toBeNull();
      expect(dbRow?.name).toBe(updatedName);
      expect(dbRow?.countryOfResidence).toBe(updatedCountry);
    });

    test('successfully updates user default currency', async ({ authUser }) => {
      const patchResponse = await authUser.api.users.updateMe({
        defaultCurrency: 'GBP',
      });

      expect(patchResponse.status()).toBe(200);
      const updatedProfile = await patchResponse.json();
      expect(updatedProfile.defaultCurrency).toBe('GBP');

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{ defaultCurrency: string }>(
        'SELECT "defaultCurrency" FROM users WHERE id = $1',
        [authUser.user.id],
      );
      expect(dbRow?.defaultCurrency).toBe('GBP');
    });

    test('accepts empty update payload and returns unchanged profile', async ({ authUser }) => {
      const beforeRes = await authUser.api.users.getMe();
      const beforeProfile = await beforeRes.json();

      const patchResponse = await authUser.api.users.updateMe({});
      expect(patchResponse.status()).toBe(200);
      const afterProfile = await patchResponse.json();

      expect(afterProfile.id).toBe(beforeProfile.id);
      expect(afterProfile.email).toBe(beforeProfile.email);
      expect(afterProfile.name).toBe(beforeProfile.name);
      expect(afterProfile.defaultCurrency).toBe(beforeProfile.defaultCurrency);
    });

    test('rejects update with invalid currency enum value', async ({ authUser }) => {
      const patchResponse = await authUser.api.users.updateMe({
        defaultCurrency: 'INVALID_CURRENCY' as any,
      });

      expect(patchResponse.status()).toBe(400);
    });

    test('rejects update with non-string name value', async ({ authUser }) => {
      const patchResponse = await authUser.api.users.updateMe({
        name: 12345 as any,
      });

      expect(patchResponse.status()).toBe(400);
    });

    test('prevents parameter tampering and IDOR attempts by stripping non-whitelisted fields', async ({ authUser }) => {
      // Attempt to tamper with id and email through PATCH body
      const tamperAttempt = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'tampered_hacker@wrightpay-qa.test',
        name: 'Legit Name Update',
      };

      const patchResponse = await authUser.api.users.updateMe(tamperAttempt as any);
      expect(patchResponse.status()).toBe(200);

      const body = await patchResponse.json();
      // Whitelisted name is updated
      expect(body.name).toBe('Legit Name Update');
      // Immutable identity fields remain completely untouched
      expect(body.id).toBe(authUser.user.id);
      expect(body.id).not.toBe(tamperAttempt.id);
      expect(body.email).toBe(authUser.user.email);
      expect(body.email).not.toBe(tamperAttempt.email);

      // Verify in PostgreSQL that id and email were not tampered with
      const dbRow = await dbClient.queryOne<{ id: string; email: string }>(
        'SELECT id, email FROM users WHERE id = $1',
        [authUser.user.id],
      );
      expect(dbRow?.id).toBe(authUser.user.id);
      expect(dbRow?.email).toBe(authUser.user.email);
    });

    test('rejects unauthorized PATCH when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.patch('users/me', {
        data: { name: 'Unauthorized Change' },
      });
      expect(response.status()).toBe(401);
    });

    test('rejects PATCH with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.patch('users/me', {
        data: { name: 'Unauthorized Change' },
        headers: {
          Authorization: 'Bearer bogus.token.string',
        },
      });
      expect(response.status()).toBe(401);
    });
  });
});

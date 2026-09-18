import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';

test.describe('Authentication Domain API Tests', () => {
  // ==========================================
  // 1. POST /auth/signup
  // ==========================================
  test.describe('POST /auth/signup', () => {
    test('successfully registers a new user with valid data and initializes database records', async ({ authApi }) => {
      const testUser = generateTestUserData();

      const response = await authApi.signup(testUser);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toBeDefined();
      expect(body.message).toBe('Signup successful. Please verify your email.');
      expect(typeof body.userId).toBe('string');
      expect(body.userId.length).toBeGreaterThan(0);

      // Cross-layer PostgreSQL validation
      const userRow = await dbClient.queryOne<{
        id: string;
        name: string;
        email: string;
        accountStatus: string;
        defaultCurrency: string;
        passwordHash: string;
      }>(
        'SELECT id, name, email, "accountStatus", "defaultCurrency", "passwordHash" FROM users WHERE id = $1',
        [body.userId],
      );

      expect(userRow).not.toBeNull();
      expect(userRow?.name).toBe(testUser.fullName);
      expect(userRow?.email).toBe(testUser.email.toLowerCase());
      expect(userRow?.accountStatus).toBe('pending');
      expect(userRow?.defaultCurrency).toBe('EUR');

      // Security check: password must be hashed (never stored plaintext)
      expect(userRow?.passwordHash).not.toBe(testUser.password);
      expect(userRow?.passwordHash.startsWith('$argon2')).toBe(true);

      // Verify default EUR wallet is initialized with zero balance
      const walletRow = await dbClient.queryOne<{
        id: string;
        userId: string;
        currency: string;
        balance: string | number;
        isDefault: boolean;
      }>(
        'SELECT id, "userId", currency, balance, "isDefault" FROM wallets WHERE "userId" = $1',
        [body.userId],
      );

      expect(walletRow).not.toBeNull();
      expect(walletRow?.userId).toBe(body.userId);
      expect(walletRow?.currency).toBe('EUR');
      expect(Number(walletRow?.balance)).toBe(0);
      expect(walletRow?.isDefault).toBe(true);
    });

    test('rejects duplicate user registration with identical email', async ({ authApi }) => {
      const testUser = generateTestUserData();

      // First registration
      const firstRes = await authApi.signup(testUser);
      expect(firstRes.status()).toBe(201);

      // Duplicate attempt
      const duplicateRes = await authApi.signup(testUser);
      expect(duplicateRes.status()).toBe(400);

      const errorBody = await duplicateRes.json();
      expect(errorBody.message).toContain('Email already in use');
    });

    test('rejects registration when required fields are missing', async ({ authApi }) => {
      const baseUser = generateTestUserData();

      // Missing password
      const { password, ...withoutPassword } = baseUser;
      const resWithoutPassword = await authApi.signup(withoutPassword as any);
      expect(resWithoutPassword.status()).toBe(400);

      // Missing firstName
      const { firstName, ...withoutFirstName } = baseUser;
      const resWithoutFirstName = await authApi.signup(withoutFirstName as any);
      expect(resWithoutFirstName.status()).toBe(400);
    });

    test('rejects registration with malformed email format', async ({ authApi }) => {
      const invalidUser = generateTestUserData({ email: 'not-an-email-format' });
      const response = await authApi.signup(invalidUser);
      expect(response.status()).toBe(400);
    });

    test('rejects registration with password shorter than 8 characters', async ({ authApi }) => {
      const invalidUser = generateTestUserData({ password: 'short' });
      const response = await authApi.signup(invalidUser);
      expect(response.status()).toBe(400);
    });
  });

  // ==========================================
  // 2. POST /auth/login
  // ==========================================
  test.describe('POST /auth/login', () => {
    test('successfully authenticates with valid credentials and returns JWT', async ({ authApi }) => {
      const testUser = generateTestUserData();
      const signupRes = await authApi.signup(testUser);
      expect(signupRes.status()).toBe(201);

      const loginRes = await authApi.login({
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status()).toBe(200);
      const body = await loginRes.json();
      expect(body).toBeDefined();

      // Token assertion (never print or hardcode token value)
      expect(typeof body.access_token).toBe('string');
      expect(body.access_token.length).toBeGreaterThan(20);

      // User object assertion
      expect(body.user).toBeDefined();
      expect(typeof body.user.id).toBe('string');
      expect(body.user.email).toBe(testUser.email.toLowerCase());
      expect(body.user.name).toBe(testUser.fullName);
    });

    test('rejects login with incorrect password', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      const loginRes = await authApi.login({
        email: testUser.email,
        password: 'IncorrectPassword999!',
      });

      expect(loginRes.status()).toBe(401);
      const errorBody = await loginRes.json();
      expect(errorBody.message).toBe('INVALID_CREDENTIALS');
    });

    test('rejects login with non-existent email', async ({ authApi }) => {
      const nonExistentEmail = `unregistered_${Date.now()}@wrightpay-qa.test`;
      const loginRes = await authApi.login({
        email: nonExistentEmail,
        password: 'SomePassword123!',
      });

      expect(loginRes.status()).toBe(401);
      const errorBody = await loginRes.json();
      expect(errorBody.message).toBe('INVALID_CREDENTIALS');
    });

    test('rejects login with missing credentials', async ({ authApi }) => {
      const res = await authApi.login({ email: '', password: '' });
      expect(res.status()).toBe(400);
    });
  });

  // ==========================================
  // 3. POST /auth/verify-email
  // ==========================================
  test.describe('POST /auth/verify-email', () => {
    test('successfully verifies email and transitions accountStatus to active in database', async ({ authApi }) => {
      const testUser = generateTestUserData();
      const signupRes = await authApi.signup(testUser);
      const { userId } = await signupRes.json();

      // Verify user starts in pending status
      const beforeRow = await dbClient.queryOne<{ accountStatus: string }>(
        'SELECT "accountStatus" FROM users WHERE id = $1',
        [userId],
      );
      expect(beforeRow?.accountStatus).toBe('pending');

      // Development OTP is 123456
      const verifyRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123456',
      });

      expect(verifyRes.status()).toBe(200);
      const body = await verifyRes.json();
      expect(body.message).toBe('Email successfully verified');

      // Verify accountStatus transitioned to active
      const afterRow = await dbClient.queryOne<{ accountStatus: string }>(
        'SELECT "accountStatus" FROM users WHERE id = $1',
        [userId],
      );
      expect(afterRow?.accountStatus).toBe('active');
    });

    test('rejects email verification with incorrect OTP code', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      const verifyRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '999999',
      });

      expect(verifyRes.status()).toBe(400);
      const errorBody = await verifyRes.json();
      expect(errorBody.message).toContain('INVALID_INPUT');
    });

    test('rejects re-verification of an already verified email', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      // First verification succeeds
      const firstRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123456',
      });
      expect(firstRes.status()).toBe(200);

      // Second verification attempt fails
      const secondRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123456',
      });
      expect(secondRes.status()).toBe(400);
      const errorBody = await secondRes.json();
      expect(errorBody.message).toContain('Email is already verified');
    });

    test('rejects email verification with invalid code format', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      // Code must be exactly 6 characters per DTO length validation
      const verifyRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123',
      });

      expect(verifyRes.status()).toBe(400);
    });
  });

  // ==========================================
  // 4. POST /auth/logout
  // ==========================================
  test.describe('POST /auth/logout', () => {
    test('successfully acknowledges logout for authenticated user', async ({ authUser }) => {
      const logoutRes = await authUser.api.auth.logout();
      expect(logoutRes.status()).toBe(200);

      const body = await logoutRes.json();
      expect(body.message).toBe('Logged out successfully');
    });

    test('rejects logout request when Authorization header is omitted', async ({ authApi }) => {
      const logoutRes = await authApi.logout();
      expect(logoutRes.status()).toBe(401);
    });
  });

  // ==========================================
  // 5. Authentication Security & Boundaries
  // ==========================================
  test.describe('Authentication Security Boundaries', () => {
    test('protected endpoint returns 401 when Authorization header is missing', async ({ apiContext }) => {
      const response = await apiContext.get('users/me');
      expect(response.status()).toBe(401);
    });

    test('protected endpoint returns 401 when scheme is not Bearer', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: 'Basic dXNlcjpwYXNzd29yZA==',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('protected endpoint returns 401 when Bearer token is malformed', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: 'Bearer invalid.malformed.jwttoken',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('protected endpoint returns 401 when token is tampered with forged signature', async ({ apiContext }) => {
      // Valid structural base64 header & payload with bogus signature
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: '00000000-0000-0000-0000-000000000000', email: 'forged@test.com' })).toString('base64url');
      const forgedJwt = `${header}.${payload}.invalidSignatureHere`;

      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: `Bearer ${forgedJwt}`,
        },
      });
      expect(response.status()).toBe(401);
    });
  });
});

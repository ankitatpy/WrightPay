import { test, expect } from '../../fixtures/api.fixtures';
import { dbClient } from '../../database/db-client';
import * as crypto from 'crypto';

function createSignedJwt(payload: Record<string, any>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

test.describe('Security & Negative-Path Audit - Authentication Domain', () => {
  const protectedEndpoints = [
    { name: 'GET /users/me', method: 'get', path: 'users/me' },
    { name: 'PATCH /users/me', method: 'patch', path: 'users/me', data: { name: 'Unauthorized' } },
    { name: 'GET /wallets/me', method: 'get', path: 'wallets/me' },
    { name: 'GET /beneficiaries', method: 'get', path: 'beneficiaries' },
    { name: 'POST /beneficiaries', method: 'post', path: 'beneficiaries', data: { name: 'Test', currency: 'EUR', payoutMethod: 'bank_account' } },
    { name: 'GET /cards', method: 'get', path: 'cards' },
    { name: 'POST /cards', method: 'post', path: 'cards', data: { cardholderName: 'Test', type: 'debit', expiryDate: '12/28' } },
    { name: 'GET /transactions', method: 'get', path: 'transactions' },
    { name: 'POST /transfers', method: 'post', path: 'transfers', data: { sendAmount: 10, destinationCurrency: 'EUR' }, headers: { 'Idempotency-Key': 'sec-test' } },
  ];

  test.describe('Missing and Malformed Authorization Headers', () => {
    for (const ep of protectedEndpoints) {
      test(`${ep.name} › rejects request when Authorization header is omitted (401 Unauthorized)`, async ({ apiContext }) => {
        const response = await apiContext.fetch(ep.path, {
          method: ep.method,
          data: ep.data,
          headers: ep.headers,
        });

        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(body.statusCode).toBe(401);
        expect(body.message).toMatch(/Unauthorized/i);
      });
    }

    test('rejects request with empty Authorization header (401 Unauthorized)', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: { Authorization: '' },
      });
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.statusCode).toBe(401);
    });

    test('rejects request with literal "Bearer" without token (401 Unauthorized)', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: { Authorization: 'Bearer' },
      });
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.statusCode).toBe(401);
    });

    test('rejects request with "Bearer " with whitespace only (401 Unauthorized)', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: { Authorization: 'Bearer   ' },
      });
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.statusCode).toBe(401);
    });

    test('rejects request with non-Bearer scheme e.g. "Basic" or "Token" (401 Unauthorized)', async ({ apiContext }) => {
      const basicResponse = await apiContext.get('users/me', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      });
      expect(basicResponse.status()).toBe(401);

      const tokenResponse = await apiContext.get('users/me', {
        headers: { Authorization: 'Token abcdef123456' },
      });
      expect(tokenResponse.status()).toBe(401);
    });

    test('rejects request with completely random garbage token (401 Unauthorized)', async ({ apiContext }) => {
      const response = await apiContext.get('wallets/me', {
        headers: { Authorization: 'Bearer not_a_real_token_at_all_123456789' },
      });
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.statusCode).toBe(401);
      expect(body.message).toMatch(/Unauthorized/i);
    });
  });

  test.describe('Cryptographic JWT Tampering & Forgery', () => {
    test('rejects forged JWT signed with an invalid secret (401 Unauthorized)', async ({ apiContext, authUser }) => {
      const forgedToken = createSignedJwt(
        { sub: authUser.user.id, email: authUser.user.email, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 },
        'attacker_compromised_secret_key_12345',
      );

      const response = await apiContext.get('users/me', {
        headers: { Authorization: `Bearer ${forgedToken}` },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.statusCode).toBe(401);
      expect(body.message).toMatch(/Unauthorized/i);
    });

    test('rejects structurally truncated JWT e.g. header.payload with missing signature (401 Unauthorized)', async ({ apiContext, authUser }) => {
      const validToken = authUser.token;
      const parts = validToken.split('.');
      expect(parts.length).toBe(3);

      const unsignedToken = `${parts[0]}.${parts[1]}`;
      const response = await apiContext.get('wallets/me', {
        headers: { Authorization: `Bearer ${unsignedToken}` },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.statusCode).toBe(401);
    });

    test('rejects payload-tampered JWT where payload was modified after signing (401 Unauthorized)', async ({ apiContext, authUser }) => {
      const validToken = authUser.token;
      const parts = validToken.split('.');

      const originalPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      const tamperedPayload = {
        ...originalPayload,
        sub: '00000000-0000-0000-0000-000000000000',
        email: 'admin_hacked@wrightpay.com',
      };
      const tamperedPayloadBase64 = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');

      const tamperedToken = `${parts[0]}.${tamperedPayloadBase64}.${parts[2]}`;

      const response = await apiContext.get('users/me', {
        headers: { Authorization: `Bearer ${tamperedToken}` },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.statusCode).toBe(401);
    });

    test('rejects expired JWT token (401 Unauthorized)', async ({ apiContext, authUser }) => {
      const expiredToken = createSignedJwt(
        { sub: authUser.user.id, email: authUser.user.email, iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 },
        process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_key_12345',
      );

      const response = await apiContext.get('cards', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.statusCode).toBe(401);
    });

    test('rejects JWT with "none" algorithm attack attempt (401 Unauthorized)', async ({ apiContext, authUser }) => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: authUser.user.id, email: authUser.user.email })).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      const response = await apiContext.get('users/me', {
        headers: { Authorization: `Bearer ${noneToken}` },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.statusCode).toBe(401);
    });
  });

  test.describe('Account Status Enforcement at Auth Boundary', () => {
    test('enforces accountStatus: SUSPENDED prevents financial transfer mutations (403 Forbidden)', async ({ authUser }) => {
      const benRes = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Suspended User Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      });
      expect(benRes.status()).toBe(201);
      const ben = await benRes.json();

      const walletRes = await authUser.api.wallet.getMyWallet();
      const wallet = await walletRes.json();

      await dbClient.query('UPDATE users SET "accountStatus" = $1 WHERE id = $2', ['suspended', authUser.user.id]);

      const transferRes = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: ben.id,
          sourceWalletId: wallet.id,
          sendAmount: 10,
          destinationCurrency: 'EUR',
        },
        `sec-suspended-${Date.now()}`,
      );

      expect(transferRes.status()).toBe(403);
      const body = await transferRes.json();
      expect(body.statusCode).toBe(403);
      expect(body.message).toMatch(/suspended/i);

      await dbClient.query('UPDATE users SET "accountStatus" = $1 WHERE id = $2', ['active', authUser.user.id]);
    });
  });
});

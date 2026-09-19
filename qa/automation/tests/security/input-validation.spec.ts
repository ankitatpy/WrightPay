import { test, expect } from '../../fixtures/api.fixtures';
import { dbClient } from '../../database/db-client';

test.describe('Security & Negative-Path Audit - Input Validation & Tampering', () => {
  test.describe('Privilege Escalation & User Object Tampering (PATCH /users/me)', () => {
    test('silently strips non-whitelisted privileged fields and prevents DB modification', async ({ authUser }) => {
      // 1. Snapshot user before tampering
      const initialUser = await dbClient.queryOne<{
        id: string;
        email: string;
        kycStatus: string;
        accountStatus: string;
        accountType: string;
      }>('SELECT id, email, "kycStatus", "accountStatus", "accountType" FROM users WHERE id = $1', [authUser.user.id]);

      expect(initialUser?.kycStatus).toBe('not_started');
      expect(initialUser?.accountStatus).toBe('active');

      // 2. Attempt malicious payload injecting privileged administrative fields
      const maliciousPayload = {
        name: 'Hacked Name',
        id: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000000',
        role: 'SUPERADMIN',
        roles: ['ADMIN', 'SUPERADMIN'],
        isAdmin: true,
        kycStatus: 'approved',
        accountStatus: 'closed',
        accountType: 'business',
        isEmailVerified: true,
        emailVerified: true,
        passwordHash: '$2b$10$attacker_injected_hash_value_here',
        balance: 999999999,
        createdAt: '2020-01-01T00:00:00.000Z',
      };

      const patchRes = await authUser.api.users.updateMe(maliciousPayload as any);
      expect(patchRes.status()).toBe(200);
      const returnedUser = await patchRes.json();

      // Verify legitimate field was updated
      expect(returnedUser.name).toBe('Hacked Name');

      // Verify privileged fields were NOT updated in returned response
      expect(returnedUser.id).toBe(authUser.user.id);
      expect(returnedUser.kycStatus).toBe('not_started');
      expect(returnedUser.accountStatus).toBe('active');
      expect(returnedUser.accountType).toBe('individual');
      expect((returnedUser as any).role).toBeUndefined();
      expect((returnedUser as any).passwordHash).toBeUndefined();

      // 3. Inspect PostgreSQL directly to prove no DB mutation occurred for privileged columns
      const dbAfter = await dbClient.queryOne<{
        id: string;
        kycStatus: string;
        accountStatus: string;
        accountType: string;
      }>('SELECT id, "kycStatus", "accountStatus", "accountType" FROM users WHERE id = $1', [authUser.user.id]);

      expect(dbAfter?.id).toBe(authUser.user.id);
      expect(dbAfter?.kycStatus).toBe('not_started');
      expect(dbAfter?.accountStatus).toBe('active');
      expect(dbAfter?.accountType).toBe('individual');
    });

    test('rejects non-whitelisted invalid enum values for defaultCurrency (400 Bad Request)', async ({ authUser }) => {
      const response = await authUser.api.users.updateMe({
        defaultCurrency: 'BITCOIN' as any,
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.statusCode).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/defaultCurrency must be one of/i)]),
      );
    });

    test('rejects non-string types for string fields e.g. boolean/number for name (400 Bad Request)', async ({ authUser }) => {
      const response = await authUser.api.users.updateMe({
        name: 123456 as any,
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.statusCode).toBe(400);
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/name must be a string/i)]),
      );
    });
  });

  test.describe('Beneficiary Domain Input Validation', () => {
    test('rejects empty beneficiary name (400 Bad Request)', async ({ authUser }) => {
      const emptyNameRes = await authUser.api.beneficiaries.createBeneficiary({
        name: '',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      });
      // Backend validates name isNotEmpty
      expect(emptyNameRes.status()).toBe(400);
    });

    test('rejects unsupported currency enum value for beneficiary (400 Bad Request)', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Invalid Currency Ben',
        currency: 'JPY' as any,
        payoutMethod: 'bank_account',
        accountNumber: '1234567890',
        bankCode: 'TEST',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects unsupported payoutMethod enum value (400 Bad Request)', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Invalid Method Ben',
        currency: 'EUR',
        payoutMethod: 'crypto_wallet' as any,
        accountNumber: '1234567890',
        bankCode: 'TEST',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects UPI payoutMethod when upiId is omitted (400 Bad Request)', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'UPI Missing ID Ben',
        currency: 'INR',
        payoutMethod: 'upi',
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(/upiId/i)]),
      );
    });
  });

  test.describe('Cards Domain Input Validation', () => {
    test('rejects card creation when cardholderName is empty (400 Bad Request)', async ({ authUser }) => {
      const response = await authUser.api.cards.createCard({
        cardholderName: '',
        cardNumber: '4242424242421234',
        type: 'debit',
        expiryDate: '12/28',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects card creation with invalid card type enum (400 Bad Request)', async ({ authUser }) => {
      const response = await authUser.api.cards.createCard({
        cardholderName: 'Test Cardholder',
        cardNumber: '4242424242421234',
        type: 'PREPAID_PLATINUM' as any,
        expiryDate: '12/28',
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Transfers Domain Input Validation & Hostile Payloads', () => {
    test('rejects non-numeric sendAmount (400 Bad Request)', async ({ authUser }) => {
      const ben = await (await authUser.api.beneficiaries.createBeneficiary({
        name: 'Input Validation Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      })).json();

      const wallet = await (await authUser.api.wallet.getMyWallet()).json();

      const response = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: ben.id,
          sourceWalletId: wallet.id,
          sendAmount: 'one-hundred-dollars' as any,
          destinationCurrency: 'EUR',
        },
        `sec-val-${Date.now()}`,
      );

      expect(response.status()).toBe(400);
    });

    test('rejects array or object passed where string/number is expected (400 Bad Request)', async ({ authUser }) => {
      const ben = await (await authUser.api.beneficiaries.createBeneficiary({
        name: 'Array Input Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      })).json();

      const wallet = await (await authUser.api.wallet.getMyWallet()).json();

      const response = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: [ben.id] as any,
          sourceWalletId: { id: wallet.id } as any,
          sendAmount: 50,
          destinationCurrency: 'EUR',
        },
        `sec-arr-${Date.now()}`,
      );

      expect(response.status()).toBe(400);
    });

    test('silently strips attacker-injected fields e.g. fee: 0, status: "completed" and applies real fee', async ({ authUser }) => {
      const ben = await (await authUser.api.beneficiaries.createBeneficiary({
        name: 'Tampering Transfer Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      })).json();

      const wallet = await (await authUser.api.wallet.getMyWallet()).json();
      await dbClient.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [wallet.id]);

      const maliciousTransferPayload = {
        beneficiaryId: ben.id,
        sourceWalletId: wallet.id,
        sendAmount: 100.0,
        destinationCurrency: 'EUR',
        fee: 0.0,
        status: 'completed',
        exchangeRate: 1000.0,
      };

      const response = await authUser.api.transfers.createTransfer(
        maliciousTransferPayload as any,
        `sec-tamper-fee-${Date.now()}`,
      );

      expect(response.status()).toBe(201);
      const result = await response.json();

      // Proves backend strictly applied real fee and real initial status
      expect(result.fee).toBe(25.0);
      expect(result.status).toBe('PENDING');

      // Proves wallet was debited 100 + 25 = 125, NOT just 100
      const walletAfter = await dbClient.queryOne<{ balance: string }>(
        'SELECT balance FROM wallets WHERE id = $1',
        [wallet.id],
      );
      expect(Number(walletAfter?.balance)).toBe(375.0);
    });
  });

  test.describe('HTTP Method & Path Abuse', () => {
    test('returns 404 for unsupported HTTP methods on registered routes', async ({ authUser, apiContext }) => {
      const putRes = await apiContext.put('users/me', {
        headers: { Authorization: `Bearer ${authUser.token}` },
        data: { name: 'New Name' },
      });
      expect(putRes.status()).toBe(404);

      const postWalletRes = await apiContext.post('wallets/me', {
        headers: { Authorization: `Bearer ${authUser.token}` },
      });
      expect(postWalletRes.status()).toBe(404);

      const getTransfersRes = await apiContext.get('transfers', {
        headers: { Authorization: `Bearer ${authUser.token}` },
      });
      expect(getTransfersRes.status()).toBe(404);
    });

    test('handles path traversal strings in resource identifiers without filesystem exposure', async ({ authUser, apiContext }) => {
      const response = await apiContext.get('transactions/..%2f..%2fetc%2fpasswd', {
        headers: { Authorization: `Bearer ${authUser.token}` },
      });

      expect([400, 404, 500]).toContain(response.status());
      const bodyText = await response.text();
      expect(bodyText).not.toMatch(/root:x:0:0/);
    });
  });
});

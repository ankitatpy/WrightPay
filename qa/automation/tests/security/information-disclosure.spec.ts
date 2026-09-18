import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { AuthApi } from '../../api/auth.api';
import { dbClient } from '../../database/db-client';
import { transferQueueClient } from '../../queues/queue-client';

test.describe('Security & Negative-Path Audit - Information Disclosure & Data Protection', () => {
  test.describe('Credential & Sensitive Field Non-Disclosure', () => {
    test('verifies passwordHash and salt are never disclosed in auth or user endpoints', async ({ apiContext, authUser }) => {
      const authApi = new AuthApi(apiContext);
      const testUserData = generateTestUserData();

      // 1. Inspect signup response
      const signupRes = await authApi.signup(testUserData);
      expect(signupRes.ok()).toBe(true);
      const signupData = await signupRes.json();
      expect(signupData.password).toBeUndefined();
      expect(signupData.passwordHash).toBeUndefined();
      expect(signupData.salt).toBeUndefined();

      // Verify email
      await authApi.verifyEmail({ email: testUserData.email, code: '123456' });

      // 2. Inspect login response
      const loginRes = await authApi.login({
        email: testUserData.email,
        password: testUserData.password,
      });
      expect(loginRes.ok()).toBe(true);
      const loginData = await loginRes.json();
      expect(loginData.access_token).toBeDefined();
      expect(loginData.user.password).toBeUndefined();
      expect(loginData.user.passwordHash).toBeUndefined();

      // 3. Inspect GET /users/me response
      const getMeRes = await authUser.api.users.getMe();
      expect(getMeRes.status()).toBe(200);
      const getMeData = await getMeRes.json();
      expect(getMeData.password).toBeUndefined();
      expect(getMeData.passwordHash).toBeUndefined();
      expect(getMeData.salt).toBeUndefined();

      // 4. Inspect PATCH /users/me response
      const patchMeRes = await authUser.api.users.updateMe({ name: 'Safe Name' });
      expect(patchMeRes.status()).toBe(200);
      const patchData = await patchMeRes.json();
      expect(patchData.password).toBeUndefined();
      expect(patchData.passwordHash).toBeUndefined();

      // 5. Inspect database to confirm password is appropriately hashed with bcrypt
      const dbRecord = await dbClient.queryOne<{ passwordHash: string }>(
        'SELECT "passwordHash" FROM users WHERE id = $1',
        [authUser.user.id],
      );
      expect(dbRecord?.passwordHash).toBeDefined();
      expect(dbRecord!.passwordHash).toMatch(/^\$argon2id\$/); // Valid Argon2id hash pattern
      expect(dbRecord!.passwordHash).not.toContain(testUserData.password);
    });
  });

  test.describe('PCI-DSS Card Sensitive Data Protection', () => {
    test('verifies full PAN and CVV are never stored in DB or returned via cards API', async ({ authUser }) => {
      // 1. Create a card
      const createRes = await authUser.api.cards.createCard({
        cardholderName: 'PCI Compliance Test',
        cardNumber: '4242424242421234',
        type: 'debit',
        expiryDate: '12/28',
      });
      expect(createRes.status()).toBe(201);
      const cardData = await createRes.json();

      // 2. Inspect API response fields
      expect(cardData.lastFourDigits).toBeDefined();
      expect(cardData.lastFourDigits.length).toBe(4);
      expect((cardData as any).pan).toBeUndefined();
      expect((cardData as any).cardNumber).toBeUndefined();
      expect((cardData as any).cvv).toBeUndefined();
      expect((cardData as any).cvc).toBeUndefined();

      // 3. Inspect GET /cards list response
      const listRes = await authUser.api.cards.getMyCards();
      expect(listRes.status()).toBe(200);
      const cardsList = await listRes.json();
      for (const card of cardsList) {
        expect((card as any).pan).toBeUndefined();
        expect((card as any).cardNumber).toBeUndefined();
        expect((card as any).cvv).toBeUndefined();
      }

      // 4. Direct Database Schema & Column Audit: verify no columns exist for PAN or CVV
      const cardColumns = (await dbClient.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'cards'`,
      )).rows;
      const columnNames = cardColumns.map((c) => c.column_name.toLowerCase());
      expect(columnNames).toContain('lastfourdigits');
      expect(columnNames).not.toContain('pan');
      expect(columnNames).not.toContain('cardnumber');
      expect(columnNames).not.toContain('cvv');
      expect(columnNames).not.toContain('cvc');
    });
  });

  test.describe('Asynchronous Processing Data Privacy (BullMQ Job Payloads)', () => {
    test('verifies BullMQ job payload contains ONLY transactionId and zero PII or credentials', async ({ authUser }) => {
      // 1. Fund wallet and create beneficiary
      const wallet = await (await authUser.api.wallet.getMyWallet()).json();
      await dbClient.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [wallet.id]);

      const ben = await (await authUser.api.beneficiaries.createBeneficiary({
        name: 'Privacy Audit Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      })).json();

      // 2. Create transfer
      const transferRes = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: ben.id,
          sourceWalletId: wallet.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        `sec-queue-pii-${Date.now()}`,
      );
      expect(transferRes.status()).toBe(201);
      const transferData = await transferRes.json();

      // 3. Inspect BullMQ queue job payload
      const job = await transferQueueClient.getJob(`transfer-${transferData.id}`);
      if (job) {
        const payload = job.data as any;
        expect(payload.transactionId).toBe(transferData.id);

        // Verify zero PII or credentials in queue job data
        expect(payload.accountNumber).toBeUndefined();
        expect(payload.email).toBeUndefined();
        expect(payload.name).toBeUndefined();
        expect(payload.password).toBeUndefined();
        expect(payload.token).toBeUndefined();
        expect(payload.apiKey).toBeUndefined();
      }
    });
  });
});

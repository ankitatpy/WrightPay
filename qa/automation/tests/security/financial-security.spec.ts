import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { AuthApi } from '../../api/auth.api';
import { WalletApi } from '../../api/wallet.api';
import { BeneficiariesApi } from '../../api/beneficiaries.api';
import { TransfersApi } from '../../api/transfers.api';
import { dbClient } from '../../database/db-client';
import { redisClient } from '../../redis/redis-client';
import { transferQueueClient } from '../../queues/queue-client';
import { config } from '../../config/env.config';

const getNormalizedApiBaseUrl = (): string => {
  return config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
};

test.describe('Security & Negative-Path Audit - Financial Domain & Idempotency Security', () => {
  test.describe('Overdraft & Amount Boundaries Invariants', () => {
    test('strictly prevents balance overdraft when sendAmount + fee exceeds wallet balance', async ({ authUser }) => {
      const ben = await (await authUser.api.beneficiaries.createBeneficiary({
        name: 'Overdraft Test Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      })).json();

      const wallet = await (await authUser.api.wallet.getMyWallet()).json();
      // Set exact balance of 100.00 EUR
      await dbClient.query('UPDATE wallets SET balance = 100.00 WHERE id = $1', [wallet.id]);

      const txCountBefore = await dbClient.queryOne<{ count: string }>('SELECT count(*) FROM transactions WHERE "userId" = $1', [authUser.user.id]);
      const initialTxCount = parseInt(txCountBefore?.count || '0', 10);

      // Attempt transfer of 80.00 EUR + 25.00 EUR fee = 105.00 EUR (exceeds 100.00 by 5.00)
      const response = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: ben.id,
          sourceWalletId: wallet.id,
          sendAmount: 80.0,
          destinationCurrency: 'EUR',
        },
        `sec-overdraft-${Date.now()}`,
      );

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toMatch(/insufficient wallet balance/i);

      // Verify wallet balance remains exactly 100.00
      const walletAfter = await dbClient.queryOne<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [wallet.id]);
      expect(Number(walletAfter?.balance)).toBe(100.0);

      // Verify no transaction record was created in PostgreSQL
      const txCountAfter = await dbClient.queryOne<{ count: string }>('SELECT count(*) FROM transactions WHERE "userId" = $1', [authUser.user.id]);
      expect(parseInt(txCountAfter?.count || '0', 10)).toBe(initialTxCount);
    });

    test('rejects negative sendAmount (-50.00) with 0 wallet mutations', async ({ authUser }) => {
      const ben = await (await authUser.api.beneficiaries.createBeneficiary({
        name: 'Negative Amount Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      })).json();

      const wallet = await (await authUser.api.wallet.getMyWallet()).json();
      await dbClient.query('UPDATE wallets SET balance = 200.00 WHERE id = $1', [wallet.id]);

      const response = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: ben.id,
          sourceWalletId: wallet.id,
          sendAmount: -50.0,
          destinationCurrency: 'EUR',
        },
        `sec-neg-${Date.now()}`,
      );

      expect(response.status()).toBe(400);

      const walletAfter = await dbClient.queryOne<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [wallet.id]);
      expect(Number(walletAfter?.balance)).toBe(200.0);
    });

    test('rejects zero sendAmount (0.00) with 0 wallet mutations', async ({ authUser }) => {
      const ben = await (await authUser.api.beneficiaries.createBeneficiary({
        name: 'Zero Amount Ben',
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
          sendAmount: 0.0,
          destinationCurrency: 'EUR',
        },
        `sec-zero-${Date.now()}`,
      );

      expect(response.status()).toBe(400);
    });

    test('rejects transfer attempt targeting a soft-deleted beneficiary', async ({ authUser }) => {
      // 1. Create beneficiary
      const benRes = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Soft Deleted Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      });
      const ben = await benRes.json();

      // 2. Soft-delete the beneficiary
      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(ben.id);
      expect(deleteRes.status()).toBe(200);

      // Verify soft deleted in DB
      const benInDb = await dbClient.queryOne<{ deletedAt: Date | null }>(
        'SELECT "deletedAt" FROM beneficiaries WHERE id = $1',
        [ben.id],
      );
      expect(benInDb?.deletedAt).not.toBeNull();

      // 3. Fund wallet
      const wallet = await (await authUser.api.wallet.getMyWallet()).json();
      await dbClient.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [wallet.id]);

      // 4. Attempt transfer to deleted beneficiary
      const transferRes = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: ben.id,
          sourceWalletId: wallet.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        `sec-deleted-ben-${Date.now()}`,
      );

      expect(transferRes.status()).toBe(404);
      const body = await transferRes.json();
      expect(body.message).toMatch(/beneficiary not found/i);

      // 5. Verify wallet balance remains intact (500.00)
      const walletAfter = await dbClient.queryOne<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [wallet.id]);
      expect(Number(walletAfter?.balance)).toBe(500.0);
    });
  });

  test.describe('Idempotency Security & Multi-User Isolation', () => {
    test('Cross-User Idempotency Isolation: User A and User B using the exact same Idempotency-Key do not collide', async ({
      playwright,
      apiContext,
      authUser: userA,
    }) => {
      // 1. Provision User B
      const userBData = generateTestUserData();
      const authApi = new AuthApi(apiContext);
      await authApi.signup(userBData);
      await authApi.verifyEmail({ email: userBData.email, code: '123456' });
      const loginRes = await authApi.login({ email: userBData.email, password: userBData.password });
      const { access_token, user: userBInfo } = await loginRes.json();

      const userBContext = await playwright.request.newContext({
        baseURL: getNormalizedApiBaseUrl(),
        extraHTTPHeaders: { Authorization: `Bearer ${access_token}` },
      });
      const userBWalletApi = new WalletApi(userBContext);
      const userBBeneficiariesApi = new BeneficiariesApi(userBContext);
      const userBTransfersApi = new TransfersApi(userBContext);

      // Setup User A
      const userAWallet = await (await userA.api.wallet.getMyWallet()).json();
      await dbClient.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [userAWallet.id]);
      const userABen = await (await userA.api.beneficiaries.createBeneficiary({
        name: 'User A Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      })).json();

      // Setup User B
      const userBWallet = await (await userBWalletApi.getMyWallet()).json();
      await dbClient.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [userBWallet.id]);
      const userBBen = await (await userBBeneficiariesApi.createBeneficiary({
        name: 'User B Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'FR7630006000011234567890189',
        bankCode: 'BNPAFRFRPP',
      })).json();

      // Common shared idempotency key
      const sharedKey = `shared-idempotency-key-${Date.now()}`;

      // 2. User A executes transfer with shared key
      const userARes = await userA.api.transfers.createTransfer(
        {
          beneficiaryId: userABen.id,
          sourceWalletId: userAWallet.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        sharedKey,
      );
      expect(userARes.status()).toBe(201);
      const userATx = await userARes.json();

      // 3. User B executes transfer with THE EXACT SAME shared key
      const userBRes = await userBTransfersApi.createTransfer(
        {
          beneficiaryId: userBBen.id,
          sourceWalletId: userBWallet.id,
          sendAmount: 75.0,
          destinationCurrency: 'EUR',
        },
        sharedKey,
      );
      expect(userBRes.status()).toBe(201);
      const userBTx = await userBRes.json();

      // 4. Assert isolation: User B got a distinct transaction, NOT User A's cached response!
      expect(userBTx.id).not.toBe(userATx.id);
      expect(userBTx.sendAmount).toBe(75.0);
      expect(userATx.sendAmount).toBe(50.0);

      // Verify two separate Redis keys exist for the two users
      const redisKeyA = `wrightpay:idempotency:transfer:${userA.user.id}:${sharedKey}`;
      const redisKeyB = `wrightpay:idempotency:transfer:${userBInfo.id}:${sharedKey}`;

      const [recordAStr, recordBStr] = await Promise.all([
        redisClient.get(redisKeyA),
        redisClient.get(redisKeyB),
      ]);
      expect(recordAStr).not.toBeNull();
      expect(recordBStr).not.toBeNull();

      const recordA = JSON.parse(recordAStr!);
      const recordB = JSON.parse(recordBStr!);
      expect(recordA.response.id).toBe(userATx.id);
      expect(recordB.response.id).toBe(userBTx.id);

      await userBContext.dispose();
    });

    test('Payload tampering detection: reusing Idempotency-Key with modified amount returns 409 Conflict', async ({ authUser }) => {
      const ben = await (await authUser.api.beneficiaries.createBeneficiary({
        name: 'Tamper Key Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      })).json();

      const wallet = await (await authUser.api.wallet.getMyWallet()).json();
      await dbClient.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [wallet.id]);

      const key = `tamper-key-${Date.now()}`;

      // 1. Initial request (50 EUR)
      const res1 = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: ben.id,
          sourceWalletId: wallet.id,
          sendAmount: 50.0,
          destinationCurrency: 'EUR',
        },
        key,
      );
      expect(res1.status()).toBe(201);

      // 2. Tampered request: same key, different sendAmount (100 EUR)
      const res2 = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: ben.id,
          sourceWalletId: wallet.id,
          sendAmount: 100.0,
          destinationCurrency: 'EUR',
        },
        key,
      );
      expect(res2.status()).toBe(409);
      const conflictBody = await res2.json();
      expect(conflictBody.statusCode).toBe(409);
      expect(conflictBody.message).toMatch(/Idempotency key was already used with a different request payload|conflict|payload mismatch/i);

      // 3. Verify wallet was ONLY debited for the initial 50 EUR + 25 fee = 75 EUR (500 - 75 = 425)
      const walletAfter = await dbClient.queryOne<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [wallet.id]);
      expect(Number(walletAfter?.balance)).toBe(425.0);
    });
  });

  test.describe('Pre-Commit Atomicity & Side Effect Audit', () => {
    test('rejected transfer deletes Redis lock and leaves zero DB transaction rows and zero BullMQ jobs', async ({ authUser }) => {
      const ben = await (await authUser.api.beneficiaries.createBeneficiary({
        name: 'Atomicity Ben',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'DE89370400440532013000',
        bankCode: 'DEUTDEDDFXX',
      })).json();

      const wallet = await (await authUser.api.wallet.getMyWallet()).json();
      // Zero balance
      await dbClient.query('UPDATE wallets SET balance = 0.00 WHERE id = $1', [wallet.id]);

      const key = `atomicity-key-${Date.now()}`;

      // Attempt transfer with insufficient balance
      const res = await authUser.api.transfers.createTransfer(
        {
          beneficiaryId: ben.id,
          sourceWalletId: wallet.id,
          sendAmount: 100.0,
          destinationCurrency: 'EUR',
        },
        key,
      );
      expect(res.status()).toBe(400);

      // Side Effect 1: Redis lock should be deleted so user can retry
      const redisKey = `wrightpay:idempotency:transfer:${authUser.user.id}:${key}`;
      const redisVal = await redisClient.get(redisKey);
      expect(redisVal).toBeNull();

      // Side Effect 2: Wallet balance unchanged
      const walletAfter = await dbClient.queryOne<{ balance: string }>('SELECT balance FROM wallets WHERE id = $1', [wallet.id]);
      expect(Number(walletAfter?.balance)).toBe(0.0);

      // Side Effect 3: Zero transaction rows in DB for this user
      const txRows = (await dbClient.query('SELECT * FROM transactions WHERE "userId" = $1', [authUser.user.id])).rows;
      expect(txRows.length).toBe(0);

      // Side Effect 4: BullMQ queue health check and no jobs left
      const isQueueHealthy = await transferQueueClient.healthCheck();
      expect(isQueueHealthy).toBe(true);
    });
  });
});

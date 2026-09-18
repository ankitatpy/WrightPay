import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { BeneficiariesApi } from '../../api';
import { CreateBeneficiaryRequest } from '../../api/types';

function generateTestBeneficiaryData(overrides?: Partial<CreateBeneficiaryRequest>): CreateBeneficiaryRequest {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return {
    name: overrides?.name || `Beneficiary_${unique}`,
    currency: overrides?.currency || 'EUR',
    payoutMethod: overrides?.payoutMethod || 'bank_account',
    accountNumber: overrides?.accountNumber || `IT12A${unique}`,
    bankCode: overrides?.bankCode || 'UNCRITM1',
    bankName: overrides?.bankName || 'UniCredit',
    ...overrides,
  };
}

function generateTestUpiBeneficiaryData(overrides?: Partial<CreateBeneficiaryRequest>): CreateBeneficiaryRequest {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return {
    name: overrides?.name || `UPI_Beneficiary_${unique}`,
    currency: 'INR',
    payoutMethod: 'upi',
    upiId: overrides?.upiId || `qa_${unique}@okhdfcbank`,
    bankName: overrides?.bankName || 'UPI',
    ...overrides,
  };
}

test.describe('Beneficiaries Domain API Tests', () => {
  // ==========================================
  // 1. GET /beneficiaries - Listing & Retrieval
  // ==========================================
  test.describe('GET /beneficiaries - Listing & Retrieval', () => {
    test('returns an empty array for a newly registered user with no beneficiaries', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.getMyBeneficiaries();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    test('returns active beneficiaries for authenticated user ordered by name ascending', async ({ authUser }) => {
      const b1 = generateTestBeneficiaryData({ name: 'Zara Phillips' });
      const b2 = generateTestBeneficiaryData({ name: 'Alice Walker' });

      const res1 = await authUser.api.beneficiaries.createBeneficiary(b1);
      expect(res1.status()).toBe(201);

      const res2 = await authUser.api.beneficiaries.createBeneficiary(b2);
      expect(res2.status()).toBe(201);

      const listRes = await authUser.api.beneficiaries.getMyBeneficiaries();
      expect(listRes.status()).toBe(200);

      const body = await listRes.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);

      // Verify sorting order is ASC by name
      expect(body[0].name).toBe('Alice Walker');
      expect(body[1].name).toBe('Zara Phillips');

      // Verify response schema contract
      expect(body[0].id).toBeDefined();
      expect(body[0].userId).toBe(authUser.user.id);
      expect(body[0].currency).toBe('EUR');
      expect(body[0].payoutMethod).toBe('bank_account');
      expect(body[0].accountNumber).toBe(b2.accountNumber);
      expect(body[0].deletedAt).toBeNull();
    });

    test('excludes soft-deleted beneficiaries from GET listing', async ({ authUser }) => {
      const bData = generateTestBeneficiaryData({ name: 'To Be Deleted' });
      const createRes = await authUser.api.beneficiaries.createBeneficiary(bData);
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      // Soft delete
      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(created.id);
      expect(deleteRes.status()).toBe(200);

      // Subsequent GET should not include the deleted beneficiary
      const listRes = await authUser.api.beneficiaries.getMyBeneficiaries();
      expect(listRes.status()).toBe(200);
      const body = await listRes.json();

      const found = body.find((b: any) => b.id === created.id);
      expect(found).toBeUndefined();
    });

    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('beneficiaries');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('beneficiaries', {
        headers: {
          Authorization: 'Bearer invalid.token.value',
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  // ==========================================
  // 2. POST /beneficiaries - Creation & Persistence
  // ==========================================
  test.describe('POST /beneficiaries - Creation & Persistence', () => {
    test('successfully creates a bank account beneficiary and verifies PostgreSQL persistence', async ({
      authUser,
    }) => {
      const payload = generateTestBeneficiaryData({
        name: 'Maria Rossi',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'IT12A345678901234567890',
        bankCode: 'UNCRITM1',
        bankName: 'UniCredit Milano',
      });

      const response = await authUser.api.beneficiaries.createBeneficiary(payload);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toBeDefined();
      expect(typeof body.id).toBe('string');
      expect(body.id.length).toBeGreaterThan(0);
      expect(body.userId).toBe(authUser.user.id);
      expect(body.name).toBe('Maria Rossi');
      expect(body.currency).toBe('EUR');
      expect(body.payoutMethod).toBe('bank_account');
      expect(body.accountNumber).toBe('IT12A345678901234567890');
      expect(body.bankCode).toBe('UNCRITM1');
      expect(body.bankName).toBe('UniCredit Milano');

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{
        id: string;
        userId: string;
        name: string;
        currency: string;
        payoutMethod: string;
        accountNumber: string;
        bankCode: string;
        bankName: string;
        deletedAt: string | null;
      }>(
        'SELECT id, "userId", name, currency, "payoutMethod", "accountNumber", "bankCode", "bankName", "deletedAt" FROM beneficiaries WHERE id = $1',
        [body.id],
      );

      expect(dbRow).not.toBeNull();
      expect(dbRow?.id).toBe(body.id);
      expect(dbRow?.userId).toBe(authUser.user.id);
      expect(dbRow?.name).toBe('Maria Rossi');
      expect(dbRow?.currency).toBe('EUR');
      expect(dbRow?.payoutMethod).toBe('bank_account');
      expect(dbRow?.accountNumber).toBe('IT12A345678901234567890');
      expect(dbRow?.bankCode).toBe('UNCRITM1');
      expect(dbRow?.bankName).toBe('UniCredit Milano');
      expect(dbRow?.deletedAt).toBeNull();
    });

    test('successfully creates a bank account beneficiary with default fallback values', async ({ authUser }) => {
      // Omit payoutMethod, bankCode, and bankName
      const payload = {
        name: 'Default Bank Beneficiary',
        currency: 'GBP' as const,
        accountNumber: 'GB29NWBK60161331926819',
      };

      const response = await authUser.api.beneficiaries.createBeneficiary(payload as any);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.payoutMethod).toBe('bank_account');
      expect(body.bankCode).toBe('DIRECT');
      expect(body.bankName).toBe('Bank Account');

      // Verify defaults in PostgreSQL
      const dbRow = await dbClient.queryOne<{
        payoutMethod: string;
        bankCode: string;
        bankName: string;
      }>('SELECT "payoutMethod", "bankCode", "bankName" FROM beneficiaries WHERE id = $1', [body.id]);

      expect(dbRow?.payoutMethod).toBe('bank_account');
      expect(dbRow?.bankCode).toBe('DIRECT');
      expect(dbRow?.bankName).toBe('Bank Account');
    });

    test('successfully creates a valid UPI beneficiary with INR currency and verifies PostgreSQL persistence', async ({
      authUser,
    }) => {
      const upiPayload = generateTestUpiBeneficiaryData({
        name: 'Rohan Sharma',
        upiId: 'rohan.sharma@okhdfcbank',
      });

      const response = await authUser.api.beneficiaries.createBeneficiary(upiPayload);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Rohan Sharma');
      expect(body.currency).toBe('INR');
      expect(body.payoutMethod).toBe('upi');
      expect(body.upiId).toBe('rohan.sharma@okhdfcbank');
      expect(body.bankName).toBe('UPI');

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{
        id: string;
        currency: string;
        payoutMethod: string;
        upiId: string;
        bankName: string;
        deletedAt: string | null;
      }>('SELECT id, currency, "payoutMethod", "upiId", "bankName", "deletedAt" FROM beneficiaries WHERE id = $1', [body.id]);

      expect(dbRow).not.toBeNull();
      expect(dbRow?.currency).toBe('INR');
      expect(dbRow?.payoutMethod).toBe('upi');
      expect(dbRow?.upiId).toBe('rohan.sharma@okhdfcbank');
      expect(dbRow?.bankName).toBe('UPI');
      expect(dbRow?.deletedAt).toBeNull();
    });
  });

  // ==========================================
  // 3. POST /beneficiaries - Validation Boundaries
  // ==========================================
  test.describe('POST /beneficiaries - Validation Boundaries', () => {
    test('rejects creation when name is missing or empty', async ({ authUser }) => {
      const resMissing = await authUser.api.beneficiaries.createBeneficiary({
        currency: 'EUR',
        accountNumber: '12345678',
      } as any);
      expect(resMissing.status()).toBe(400);

      const resEmpty = await authUser.api.beneficiaries.createBeneficiary({
        name: '',
        currency: 'EUR',
        accountNumber: '12345678',
      });
      expect(resEmpty.status()).toBe(400);
    });

    test('rejects creation with invalid currency enum value', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Invalid Currency',
        currency: 'XYZ' as any,
        accountNumber: '12345678',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects bank account creation when accountNumber is missing', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Missing Account',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        bankCode: 'UNCRITM1',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects bank account creation when bankCode is missing and payoutMethod is bank_account', async ({
      authUser,
    }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Missing Bank Code',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: '1234567890',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects creation with unsupported payoutMethod enum value', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Bad Method',
        currency: 'EUR',
        payoutMethod: 'crypto' as any,
        accountNumber: '12345678',
      });
      expect(response.status()).toBe(400);
    });
  });

  // ==========================================
  // 4. POST /beneficiaries - UPI & Currency Business Rules
  // ==========================================
  test.describe('POST /beneficiaries - UPI & Currency Business Rules', () => {
    test('rejects UPI beneficiary when currency is not INR', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Invalid UPI Currency',
        currency: 'USD',
        payoutMethod: 'upi',
        upiId: 'user@okhdfcbank',
      });

      expect(response.status()).toBe(400);
      const errorBody = await response.json();
      expect(errorBody.message).toContain('UPI payout method is only supported for INR currency');
    });

    test('rejects UPI beneficiary when upiId is missing or empty', async ({ authUser }) => {
      const resMissing = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Missing UPI ID',
        currency: 'INR',
        payoutMethod: 'upi',
      });
      expect(resMissing.status()).toBe(400);

      const resEmpty = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Empty UPI ID',
        currency: 'INR',
        payoutMethod: 'upi',
        upiId: '   ',
      });
      expect(resEmpty.status()).toBe(400);
    });
  });

  // ==========================================
  // 5. POST /beneficiaries - Maximum Active Limit
  // ==========================================
  test.describe('POST /beneficiaries - Maximum Active Beneficiary Limit', () => {
    test('enforces maximum limit of 3 active beneficiaries per user and rejects 4th creation', async ({
      authUser,
    }) => {
      // Beneficiary 1
      const res1 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 1' }));
      expect(res1.status()).toBe(201);

      // Beneficiary 2
      const res2 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 2' }));
      expect(res2.status()).toBe(201);

      // Beneficiary 3
      const res3 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 3' }));
      expect(res3.status()).toBe(201);

      // Beneficiary 4 - Must be rejected
      const res4 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 4' }));
      expect(res4.status()).toBe(400);
      const errorBody = await res4.json();
      expect(errorBody.message).toContain('Maximum limit of 3 active beneficiaries reached');

      // Verify active count in PostgreSQL
      const dbCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "deletedAt" IS NULL',
        [authUser.user.id],
      );
      expect(Number(dbCount?.count)).toBe(3);
    });
  });

  // ==========================================
  // 6. DELETE /beneficiaries/:id - Soft Deletion & Slot Reuse
  // ==========================================
  test.describe('DELETE /beneficiaries/:id - Soft Deletion & Slot Reuse', () => {
    test('soft deletes beneficiary by populating deletedAt timestamp in PostgreSQL database', async ({ authUser }) => {
      const beneficiary = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData())
      ).json();

      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(beneficiary.id);
      expect(deleteRes.status()).toBe(200);

      const deleteBody = await deleteRes.json();
      expect(deleteBody.message).toBe('Beneficiary successfully deleted');
      expect(deleteBody.id).toBe(beneficiary.id);

      // Verify database record still physically exists but deletedAt is populated
      const dbRow = await dbClient.queryOne<{
        id: string;
        deletedAt: string | null;
      }>('SELECT id, "deletedAt" FROM beneficiaries WHERE id = $1', [beneficiary.id]);

      expect(dbRow).not.toBeNull();
      expect(dbRow?.id).toBe(beneficiary.id);
      expect(dbRow?.deletedAt).not.toBeNull();
    });

    test('repeated deletion of an already soft-deleted beneficiary returns 404', async ({ authUser }) => {
      const beneficiary = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData())
      ).json();

      // First delete succeeds
      const res1 = await authUser.api.beneficiaries.deleteBeneficiary(beneficiary.id);
      expect(res1.status()).toBe(200);

      // Second delete fails with 404
      const res2 = await authUser.api.beneficiaries.deleteBeneficiary(beneficiary.id);
      expect(res2.status()).toBe(404);
      const errorBody = await res2.json();
      expect(errorBody.message).toContain('Beneficiary not found');
    });

    test('soft deletion frees an active slot allowing a new beneficiary to be created under max 3 limit', async ({
      authUser,
    }) => {
      // Create 3 active beneficiaries
      const b1 = await (await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 1' }))).json();
      await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 2' }));
      await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 3' }));

      // Attempt 4th creation -> rejected
      const rejectRes = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 4' }));
      expect(rejectRes.status()).toBe(400);

      // Soft delete b1
      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(b1.id);
      expect(deleteRes.status()).toBe(200);

      // Confirm active count is now 2
      const activeCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "deletedAt" IS NULL',
        [authUser.user.id],
      );
      expect(Number(activeCount?.count)).toBe(2);

      // Now create a 4th beneficiary -> must succeed
      const newRes = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'New Slot Beneficiary' }));
      expect(newRes.status()).toBe(201);
      const newBen = await newRes.json();
      expect(newBen.id).toBeDefined();

      // Total rows in DB is 4 (3 active, 1 soft-deleted)
      const totalCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(totalCount?.count)).toBe(4);
    });
  });

  // ==========================================
  // 7. Multi-Tenant Isolation & Cross-User Security (IDOR)
  // ==========================================
  test.describe('Multi-Tenant Isolation & Cross-User Security (IDOR)', () => {
    test('enforces strict multi-tenant isolation and rejects cross-user beneficiary deletion (IDOR)', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A creates Beneficiary A
      const benA = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'User A Beneficiary' }))
      ).json();

      // Provision User B
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({ email: testUserB.email, password: testUserB.password });
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: (await authUser.api.beneficiaries.getMyBeneficiaries()).url().replace(/\/beneficiaries.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const beneficiariesApiB = new BeneficiariesApi(contextB);

      // User B attempts to DELETE User A's beneficiary
      const idorDeleteRes = await beneficiariesApiB.deleteBeneficiary(benA.id);
      expect(idorDeleteRes.status()).toBe(404);
      const errorBody = await idorDeleteRes.json();
      expect(errorBody.message).toContain('Beneficiary not found');

      // Confirm Beneficiary A was NOT soft-deleted in PostgreSQL
      const dbRow = await dbClient.queryOne<{ deletedAt: string | null }>(
        'SELECT "deletedAt" FROM beneficiaries WHERE id = $1',
        [benA.id],
      );
      expect(dbRow?.deletedAt).toBeNull();

      await contextB.dispose();
    });

    test('ensures GET /beneficiaries isolates user data and never leaks beneficiaries across accounts', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A creates Beneficiary A
      const benA = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'User A Secret Beneficiary' }))
      ).json();

      // Provision User B
      const testUserB = generateTestUserData();
      await authApi.signup(testUserB);
      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });
      const loginB = await authApi.login({ email: testUserB.email, password: testUserB.password });
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: (await authUser.api.beneficiaries.getMyBeneficiaries()).url().replace(/\/beneficiaries.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const beneficiariesApiB = new BeneficiariesApi(contextB);
      const benB = await (
        await beneficiariesApiB.createBeneficiary(generateTestBeneficiaryData({ name: 'User B Beneficiary' }))
      ).json();

      // User A listing
      const listA = await (await authUser.api.beneficiaries.getMyBeneficiaries()).json();
      expect(listA.some((b: any) => b.id === benA.id)).toBe(true);
      expect(listA.some((b: any) => b.id === benB.id)).toBe(false);

      // User B listing
      const listB = await (await beneficiariesApiB.getMyBeneficiaries()).json();
      expect(listB.some((b: any) => b.id === benB.id)).toBe(true);
      expect(listB.some((b: any) => b.id === benA.id)).toBe(false);

      await contextB.dispose();
    });
  });

  // ==========================================
  // 8. Invalid & Non-Existent Identifier Boundaries
  // ==========================================
  test.describe('Invalid & Non-Existent Identifier Boundaries', () => {
    test('returns 404 when attempting to delete a non-existent beneficiary UUID', async ({ authUser }) => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const response = await authUser.api.beneficiaries.deleteBeneficiary(nonExistentUuid);
      expect(response.status()).toBe(404);
      const errorBody = await response.json();
      expect(errorBody.message).toContain('Beneficiary not found');
    });
  });

  // ==========================================
  // 9. Duplicate Beneficiary Handling
  // ==========================================
  test.describe('Duplicate Beneficiary Handling', () => {
    test('allows creating multiple beneficiaries with the same name or details without constraint failure', async ({
      authUser,
    }) => {
      const sharedName = 'Duplicate Recipient';
      const sharedAccount = 'DE89370400440532013000';

      const res1 = await authUser.api.beneficiaries.createBeneficiary({
        name: sharedName,
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: sharedAccount,
        bankCode: 'DBKDEFF',
      });
      expect(res1.status()).toBe(201);
      const b1 = await res1.json();

      const res2 = await authUser.api.beneficiaries.createBeneficiary({
        name: sharedName,
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: sharedAccount,
        bankCode: 'DBKDEFF',
      });
      expect(res2.status()).toBe(201);
      const b2 = await res2.json();

      expect(b1.id).not.toBe(b2.id);
      expect(b1.name).toBe(b2.name);
      expect(b1.accountNumber).toBe(b2.accountNumber);

      // Verify both exist in database
      const count = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "accountNumber" = $2',
        [authUser.user.id, sharedAccount],
      );
      expect(Number(count?.count)).toBe(2);
    });
  });

  // ==========================================
  // 10. Authentication & Authorization Boundaries
  // ==========================================
  test.describe('Authentication & Authorization Boundaries', () => {
    test('rejects POST /beneficiaries when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.post('beneficiaries', {
        data: {
          name: 'Unauthorized Beneficiary',
          currency: 'EUR',
          accountNumber: '12345678',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('rejects DELETE /beneficiaries/:id when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.delete('beneficiaries/00000000-0000-0000-0000-000000000000');
      expect(response.status()).toBe(401);
    });
  });
});

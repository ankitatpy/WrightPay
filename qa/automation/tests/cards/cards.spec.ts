import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { CardsApi } from '../../api';
import { CreateCardRequest } from '../../api/types';

function generateTestCardData(overrides?: Partial<CreateCardRequest>): CreateCardRequest {
  return {
    cardholderName: overrides?.cardholderName || 'John Doe',
    cardNumber: overrides?.cardNumber || '4242424242421234',
    expiryDate: overrides?.expiryDate || '12/28',
    cvv: overrides?.cvv || '123',
    type: overrides?.type,
  };
}

test.describe('Cards Domain API Tests', () => {
  // ==========================================
  // 1. GET /cards - Retrieval & Empty State
  // ==========================================
  test.describe('GET /cards - Listing & Retrieval', () => {
    test('returns an empty array for a newly registered user with no cards', async ({ authUser }) => {
      const response = await authUser.api.cards.getMyCards();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    test('returns list of user cards after successful card creation', async ({ authUser }) => {
      const cardPayload = generateTestCardData();
      const createRes = await authUser.api.cards.createCard(cardPayload);
      expect(createRes.status()).toBe(201);
      const createdCard = await createRes.json();

      const listRes = await authUser.api.cards.getMyCards();
      expect(listRes.status()).toBe(200);
      const cards = await listRes.json();

      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBeGreaterThanOrEqual(1);

      const found = cards.find((c: any) => c.id === createdCard.id);
      expect(found).toBeDefined();
      expect(found.cardholderName).toBe('JOHN DOE');
      expect(found.lastFourDigits).toBe('1234');
      expect(found.status).toBe('active');
    });

    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('cards');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('cards', {
        headers: {
          Authorization: 'Bearer invalid.token.value',
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  // ==========================================
  // 2. POST /cards - Creation & Persistence
  // ==========================================
  test.describe('POST /cards - Creation & Database Verification', () => {
    test('successfully provisions an active debit card with masked PAN and verifies PostgreSQL persistence', async ({
      authUser,
    }) => {
      const cardPayload = generateTestCardData({
        cardholderName: 'Alice Springs',
        cardNumber: '5555444433339876',
        expiryDate: '10/29',
        cvv: '999',
      });

      const response = await authUser.api.cards.createCard(cardPayload);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toBeDefined();
      expect(typeof body.id).toBe('string');
      expect(body.id.length).toBeGreaterThan(0);
      expect(body.cardholderName).toBe('ALICE SPRINGS');
      expect(body.lastFourDigits).toBe('9876');
      expect(body.expiryDate).toBe('10/29');
      expect(body.status).toBe('active');
      expect(body.type).toBe('debit');

      // Security check: raw card number and CVV must never be returned in API response
      expect(body.cardNumber).toBeUndefined();
      expect(body.cvv).toBeUndefined();

      // Cross-layer PostgreSQL verification
      const dbCard = await dbClient.queryOne<{
        id: string;
        userId: string;
        cardholderName: string;
        lastFourDigits: string;
        expiryDate: string;
        status: string;
        type: string;
      }>(
        'SELECT id, "userId", "cardholderName", "lastFourDigits", "expiryDate", status, type FROM cards WHERE id = $1',
        [body.id],
      );

      expect(dbCard).not.toBeNull();
      expect(dbCard?.id).toBe(body.id);
      expect(dbCard?.userId).toBe(authUser.user.id);
      expect(dbCard?.cardholderName).toBe('ALICE SPRINGS');
      expect(dbCard?.lastFourDigits).toBe('9876');
      expect(dbCard?.expiryDate).toBe('10/29');
      expect(dbCard?.status).toBe('active');
      expect(dbCard?.type).toBe('debit');
    });

    test('successfully provisions a credit card when explicitly requested', async ({ authUser }) => {
      const cardPayload = generateTestCardData({
        type: 'credit',
      });

      const response = await authUser.api.cards.createCard(cardPayload);
      expect(response.status()).toBe(201);
      const body = await response.json();

      expect(body.type).toBe('credit');

      // Cross-layer DB verification
      const dbCard = await dbClient.queryOne<{ type: string }>(
        'SELECT type FROM cards WHERE id = $1',
        [body.id],
      );
      expect(dbCard?.type).toBe('credit');
    });
  });

  // ==========================================
  // 3. POST /cards - Validation Boundaries
  // ==========================================
  test.describe('POST /cards - Validation Boundaries', () => {
    test('rejects card creation when cardholderName is missing or empty', async ({ authUser }) => {
      const response = await authUser.api.cards.createCard({
        cardholderName: '',
        cardNumber: '4242424242421234',
        expiryDate: '12/28',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects card creation with invalid expiry date format', async ({ authUser }) => {
      // Month > 12
      const resInvalidMonth = await authUser.api.cards.createCard({
        cardholderName: 'Invalid Expiry',
        cardNumber: '4242424242421234',
        expiryDate: '13/28',
      });
      expect(resInvalidMonth.status()).toBe(400);

      // Non-numeric string
      const resNonNumeric = await authUser.api.cards.createCard({
        cardholderName: 'Invalid Expiry',
        cardNumber: '4242424242421234',
        expiryDate: 'invalid',
      });
      expect(resNonNumeric.status()).toBe(400);
    });

    test('rejects card creation with unsupported card type enum', async ({ authUser }) => {
      const response = await authUser.api.cards.createCard({
        cardholderName: 'Bad Enum',
        cardNumber: '4242424242421234',
        expiryDate: '12/28',
        type: 'prepaid' as any,
      });
      expect(response.status()).toBe(400);
    });
  });

  // ==========================================
  // 4. Card State Machine - Lifecycle
  // ==========================================
  test.describe('Card State Machine - Lifecycle Transitions', () => {
    test('transitions an active card to frozen status via freeze endpoint', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      expect(card.status).toBe('active');

      const freezeRes = await authUser.api.cards.freezeCard(card.id);
      expect(freezeRes.status()).toBe(200);
      const frozenCard = await freezeRes.json();
      expect(frozenCard.id).toBe(card.id);
      expect(frozenCard.status).toBe('frozen');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('frozen');
    });

    test('transitions a frozen card back to active status via unfreeze endpoint', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.freezeCard(card.id);

      const unfreezeRes = await authUser.api.cards.unfreezeCard(card.id);
      expect(unfreezeRes.status()).toBe(200);
      const activeCard = await unfreezeRes.json();
      expect(activeCard.id).toBe(card.id);
      expect(activeCard.status).toBe('active');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('active');
    });

    test('transitions an active card to terminal deactivated status via deactivate endpoint', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();

      const deactivateRes = await authUser.api.cards.deactivateCard(card.id);
      expect(deactivateRes.status()).toBe(200);
      const deactivatedCard = await deactivateRes.json();
      expect(deactivatedCard.id).toBe(card.id);
      expect(deactivatedCard.status).toBe('deactivated');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('deactivated');
    });

    test('allows deactivating a frozen card directly', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.freezeCard(card.id);

      const deactivateRes = await authUser.api.cards.deactivateCard(card.id);
      expect(deactivateRes.status()).toBe(200);
      const deactivatedCard = await deactivateRes.json();
      expect(deactivatedCard.status).toBe('deactivated');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('deactivated');
    });
  });

  // ==========================================
  // 5. Card State Machine - Invalid Transitions
  // ==========================================
  test.describe('Card State Machine - Invalid State Transitions', () => {
    test('rejects freezing an already frozen card with 400', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.freezeCard(card.id);

      // Second freeze call should be rejected
      const secondFreezeRes = await authUser.api.cards.freezeCard(card.id);
      expect(secondFreezeRes.status()).toBe(400);
      const errorBody = await secondFreezeRes.json();
      expect(errorBody.message).toContain('Card is already frozen');
    });

    test('rejects unfreezing an already active card with 400', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      expect(card.status).toBe('active');

      const unfreezeRes = await authUser.api.cards.unfreezeCard(card.id);
      expect(unfreezeRes.status()).toBe(400);
      const errorBody = await unfreezeRes.json();
      expect(errorBody.message).toContain('Card is already active');
    });

    test('rejects state modifications on a deactivated card with 400', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.deactivateCard(card.id);

      // Attempt freeze on deactivated card
      const freezeRes = await authUser.api.cards.freezeCard(card.id);
      expect(freezeRes.status()).toBe(400);
      const freezeError = await freezeRes.json();
      expect(freezeError.message).toContain('Deactivated card cannot be modified');

      // Attempt unfreeze on deactivated card
      const unfreezeRes = await authUser.api.cards.unfreezeCard(card.id);
      expect(unfreezeRes.status()).toBe(400);
      const unfreezeError = await unfreezeRes.json();
      expect(unfreezeError.message).toContain('Deactivated card cannot be modified');

      // Attempt duplicate deactivation
      const deactivateRes = await authUser.api.cards.deactivateCard(card.id);
      expect(deactivateRes.status()).toBe(400);
      const deactivateError = await deactivateRes.json();
      expect(deactivateError.message).toContain('Card is already deactivated');
    });
  });

  // ==========================================
  // 6. Hard Deletion & IDOR Security Boundaries
  // ==========================================
  test.describe('Hard Deletion & Cross-User Security', () => {
    test('hard deletes card from PostgreSQL database and excludes it from subsequent listings', async ({
      authUser,
    }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();

      const deleteRes = await authUser.api.cards.deleteCard(card.id);
      expect(deleteRes.status()).toBe(200);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.message).toBe('Card successfully deleted');
      expect(deleteBody.id).toBe(card.id);

      // PostgreSQL verification: card record must be physically deleted (count = 0)
      const dbCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM cards WHERE id = $1',
        [card.id],
      );
      expect(Number(dbCount?.count)).toBe(0);

      // GET /cards must no longer contain the deleted card
      const listRes = await authUser.api.cards.getMyCards();
      const cards = await listRes.json();
      const found = cards.find((c: any) => c.id === card.id);
      expect(found).toBeUndefined();

      // Subsequent delete attempt must return 404
      const secondDeleteRes = await authUser.api.cards.deleteCard(card.id);
      expect(secondDeleteRes.status()).toBe(404);
    });

    test('returns 404 when deleting a non-existent card UUID', async ({ authUser }) => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const response = await authUser.api.cards.deleteCard(nonExistentUuid);
      expect(response.status()).toBe(404);
    });

    test('enforces strict multi-tenant isolation and rejects cross-user card manipulation (IDOR)', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A creates Card A
      const cardA = await (await authUser.api.cards.createCard(generateTestCardData({ cardholderName: 'User A Card' }))).json();

      // Provision User B
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({ email: testUserB.email, password: testUserB.password });
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: (await authUser.api.cards.getMyCards()).url().replace(/\/cards.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const cardsApiB = new CardsApi(contextB);

      // User B creates Card B
      const cardB = await (await cardsApiB.createCard(generateTestCardData({ cardholderName: 'User B Card' }))).json();

      // Multi-tenant visibility isolation: User A sees only Card A, User B sees only Card B
      const listA = await (await authUser.api.cards.getMyCards()).json();
      const listB = await (await cardsApiB.getMyCards()).json();

      expect(listA.some((c: any) => c.id === cardA.id)).toBe(true);
      expect(listA.some((c: any) => c.id === cardB.id)).toBe(false);

      expect(listB.some((c: any) => c.id === cardB.id)).toBe(true);
      expect(listB.some((c: any) => c.id === cardA.id)).toBe(false);

      // IDOR attempts: User B attempting to mutate or delete User A's card must return 404
      const freezeAttempt = await cardsApiB.freezeCard(cardA.id);
      expect(freezeAttempt.status()).toBe(404);

      const unfreezeAttempt = await cardsApiB.unfreezeCard(cardA.id);
      expect(unfreezeAttempt.status()).toBe(404);

      const deactivateAttempt = await cardsApiB.deactivateCard(cardA.id);
      expect(deactivateAttempt.status()).toBe(404);

      const deleteAttempt = await cardsApiB.deleteCard(cardA.id);
      expect(deleteAttempt.status()).toBe(404);

      // Confirm Card A status remains untouched in PostgreSQL
      const dbCardA = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [cardA.id]);
      expect(dbCardA?.status).toBe('active');

      await contextB.dispose();
    });
  });
});

import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { AuthApi } from '../../api/auth.api';
import { WalletApi } from '../../api/wallet.api';
import { BeneficiariesApi } from '../../api/beneficiaries.api';
import { CardsApi } from '../../api/cards.api';
import { TransfersApi } from '../../api/transfers.api';
import { dbClient } from '../../database/db-client';
import { config } from '../../config/env.config';

const getNormalizedApiBaseUrl = (): string => {
  return config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
};

test.describe('Security & Negative-Path Audit - Authorization & IDOR Domain', () => {
  test('Cross-User IDOR & Resource Segregation: User A cannot read or mutate User B resources', async ({
    playwright,
    apiContext,
    authUser: userA,
  }) => {
    // 1. Provision User B via real API
    const userBData = generateTestUserData();
    const authApi = new AuthApi(apiContext);
    const signupRes = await authApi.signup(userBData);
    expect(signupRes.ok()).toBe(true);

    const verifyRes = await authApi.verifyEmail({ email: userBData.email, code: '123456' });
    expect(verifyRes.ok()).toBe(true);

    const loginRes = await authApi.login({ email: userBData.email, password: userBData.password });
    expect(loginRes.ok()).toBe(true);
    const loginData = await loginRes.json();
    const userBToken = loginData.access_token;

    // Create User B authenticated context and clients
    const userBContext = await playwright.request.newContext({
      baseURL: getNormalizedApiBaseUrl(),
      extraHTTPHeaders: { Authorization: `Bearer ${userBToken}` },
    });
    const userBWalletApi = new WalletApi(userBContext);
    const userBBeneficiariesApi = new BeneficiariesApi(userBContext);
    const userBCardsApi = new CardsApi(userBContext);
    const userBTransfersApi = new TransfersApi(userBContext);

    // 2. Setup User B Resources
    // User B Wallet: fund with 500 EUR
    const userBWalletRes = await userBWalletApi.getMyWallet();
    const userBWallet = await userBWalletRes.json();
    await dbClient.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [userBWallet.id]);

    // User B Beneficiary
    const userBBenRes = await userBBeneficiariesApi.createBeneficiary({
      name: 'User B Beneficiary',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'FR7630006000011234567890189',
      bankCode: 'BNPAFRFRPP',
    });
    expect(userBBenRes.status()).toBe(201);
    const userBBen = await userBBenRes.json();

    // User B Card
    const userBCardRes = await userBCardsApi.createCard({
      cardholderName: 'User B Debit',
      cardNumber: '4242424242421234',
      type: 'debit',
      expiryDate: '12/28',
    });
    expect(userBCardRes.status()).toBe(201);
    const userBCard = await userBCardRes.json();

    // User B Transaction (Transfer)
    const userBTxRes = await userBTransfersApi.createTransfer(
      {
        beneficiaryId: userBBen.id,
        sourceWalletId: userBWallet.id,
        sendAmount: 50.0,
        destinationCurrency: 'EUR',
      },
      `idor-setup-b-${Date.now()}`,
    );
    expect(userBTxRes.status()).toBe(201);
    const userBTx = await userBTxRes.json();

    // Setup User A Resources for cross-tests
    const userAWallet = await (await userA.api.wallet.getMyWallet()).json();
    await dbClient.query('UPDATE wallets SET balance = 500.00 WHERE id = $1', [userAWallet.id]);

    // ----------------------------------------------------
    // IDOR TEST 1: GET /transactions/:id
    // User A attempts to view User B's transaction
    // ----------------------------------------------------
    const crossTxRes = await userA.api.transactions.getTransactionById(userBTx.id);
    expect(crossTxRes.status()).toBe(404);
    const crossTxBody = await crossTxRes.json();
    expect(crossTxBody.statusCode).toBe(404);
    expect(crossTxBody.message).toMatch(/not found/i);

    // ----------------------------------------------------
    // IDOR TEST 2: GET /beneficiaries list segregation
    // User A cannot see User B's beneficiary in their list
    // ----------------------------------------------------
    const userABenListRes = await userA.api.beneficiaries.getMyBeneficiaries();
    expect(userABenListRes.status()).toBe(200);
    const userABenList = await userABenListRes.json();
    const leakedBen = userABenList.find((b: any) => b.id === userBBen.id);
    expect(leakedBen).toBeUndefined();

    // ----------------------------------------------------
    // IDOR TEST 3: DELETE /beneficiaries/:id
    // User A attempts to delete User B's beneficiary
    // ----------------------------------------------------
    const deleteCrossBenRes = await userA.api.beneficiaries.deleteBeneficiary(userBBen.id);
    expect(deleteCrossBenRes.status()).toBe(404);

    // Verify User B's beneficiary remains intact in PostgreSQL
    const benInDb = await dbClient.queryOne<{ deletedAt: Date | null }>(
      'SELECT "deletedAt" FROM beneficiaries WHERE id = $1',
      [userBBen.id],
    );
    expect(benInDb?.deletedAt).toBeNull();

    // ----------------------------------------------------
    // IDOR TEST 4: GET /cards list segregation
    // User A cannot see User B's card in their list
    // ----------------------------------------------------
    const userACardListRes = await userA.api.cards.getMyCards();
    expect(userACardListRes.status()).toBe(200);
    const userACardList = await userACardListRes.json();
    const leakedCard = userACardList.find((c: any) => c.id === userBCard.id);
    expect(leakedCard).toBeUndefined();

    // ----------------------------------------------------
    // IDOR TEST 5: POST /cards/:id/freeze
    // User A attempts to freeze User B's card
    // ----------------------------------------------------
    const freezeCrossCardRes = await userA.api.cards.freezeCard(userBCard.id);
    expect(freezeCrossCardRes.status()).toBe(404);

    // Verify User B's card status in PostgreSQL remains ACTIVE
    const cardInDb = await dbClient.queryOne<{ status: string }>(
      'SELECT status FROM cards WHERE id = $1',
      [userBCard.id],
    );
    expect(cardInDb?.status).toBe('active');

    // ----------------------------------------------------
    // IDOR TEST 6: POST /cards/:id/deactivate
    // User A attempts to deactivate User B's card
    // ----------------------------------------------------
    const deactCrossCardRes = await userA.api.cards.deactivateCard(userBCard.id);
    expect(deactCrossCardRes.status()).toBe(404);

    // ----------------------------------------------------
    // IDOR TEST 7: DELETE /cards/:id
    // User A attempts to delete User B's card
    // ----------------------------------------------------
    const deleteCrossCardRes = await userA.api.cards.deleteCard(userBCard.id);
    expect(deleteCrossCardRes.status()).toBe(404);

    const cardStillInDb = await dbClient.queryOne(
      'SELECT id FROM cards WHERE id = $1',
      [userBCard.id],
    );
    expect(cardStillInDb).toBeDefined();

    // ----------------------------------------------------
    // IDOR TEST 8: POST /transfers - Cross-user Source Wallet
    // User A attempts to fund a transfer from User B's wallet
    // ----------------------------------------------------
    const userABenRes = await userA.api.beneficiaries.createBeneficiary({
      name: 'User A Beneficiary',
      currency: 'EUR',
      payoutMethod: 'bank_account',
      accountNumber: 'DE89370400440532013000',
      bankCode: 'DEUTDEDDFXX',
    });
    const userABen = await userABenRes.json();

    const crossWalletTxRes = await userA.api.transfers.createTransfer(
      {
        beneficiaryId: userABen.id,
        sourceWalletId: userBWallet.id, // User B's wallet!
        sendAmount: 100.0,
        destinationCurrency: 'EUR',
      },
      `idor-cross-wallet-${Date.now()}`,
    );
    expect(crossWalletTxRes.status()).toBe(404);
    const crossWalletBody = await crossWalletTxRes.json();
    expect(crossWalletBody.message).toMatch(/wallet not found/i);

    // Verify User B's wallet balance was NOT debited
    const userBWalletAfter = await dbClient.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [userBWallet.id],
    );
    // Was 500.00 initially, minus 75 (50 + 25 fee from setup transfer) = 425.00
    expect(Number(userBWalletAfter?.balance)).toBe(425.0);

    // ----------------------------------------------------
    // IDOR TEST 9: POST /transfers - Cross-user Beneficiary
    // User A attempts to transfer to User B's beneficiary
    // ----------------------------------------------------
    const crossBenTxRes = await userA.api.transfers.createTransfer(
      {
        beneficiaryId: userBBen.id, // User B's beneficiary!
        sourceWalletId: userAWallet.id,
        sendAmount: 50.0,
        destinationCurrency: 'EUR',
      },
      `idor-cross-ben-${Date.now()}`,
    );
    expect(crossBenTxRes.status()).toBe(404);
    const crossBenBody = await crossBenTxRes.json();
    expect(crossBenBody.message).toMatch(/beneficiary not found/i);

    // Verify User A's wallet was NOT debited
    const userAWalletAfter = await dbClient.queryOne<{ balance: string }>(
      'SELECT balance FROM wallets WHERE id = $1',
      [userAWallet.id],
    );
    expect(Number(userAWalletAfter?.balance)).toBe(500.0);

    await userBContext.dispose();
  });
});

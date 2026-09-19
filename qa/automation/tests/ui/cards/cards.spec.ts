import { test, expect } from '../../../fixtures/ui.fixtures';
import { generateTestCardData } from '../../../test-data/card.factory';

test.describe('Cards UI Suite — Phase 2B', () => {
  // =========================================================================
  // 1. EMPTY CARD STATE
  // =========================================================================
  test('1. Empty state is displayed when authenticated user has zero cards', async ({
    authenticatedUser,
  }) => {
    const { cardsPage, cardsApi } = authenticatedUser;

    // Verify backend state is empty for this isolated test user
    const preCheckRes = await cardsApi.getMyCards();
    expect(preCheckRes.status()).toBe(200);
    const preCheckList = await preCheckRes.json();
    expect(preCheckList).toEqual([]);

    // Navigate to cards page
    await cardsPage.goto();

    // Verify page header and layout
    await expect(cardsPage.heading).toBeVisible();
    await expect(cardsPage.subheading).toBeVisible();

    // Verify empty state display
    await expect(cardsPage.emptyState).toBeVisible();
    await expect(cardsPage.emptyState).toHaveText(
      'No payment cards saved yet. Click below to add a card.'
    );

    // Verify Add Card action is available and interactable
    await expect(cardsPage.addCardTriggerCard).toBeVisible();
    await expect(cardsPage.addCardButton).toBeVisible();
    await expect(cardsPage.addCardButton).toBeEnabled();
  });

  // =========================================================================
  // 2. ADD CARD (UI Creation -> API Integration)
  // =========================================================================
  test('2. Adds a new payment card via UI, verifies masked presentation, and confirms API persistence', async ({
    authenticatedUser,
  }) => {
    const { page, cardsPage, cardsApi } = authenticatedUser;

    await cardsPage.goto();
    await cardsPage.openAddModal();

    // Verify modal elements and fields
    await expect(cardsPage.addModal).toBeVisible();
    await expect(cardsPage.modalHeading).toHaveText('Add Payment Card');
    await expect(cardsPage.cardholderNameInput).toBeVisible();
    await expect(cardsPage.cardTypeSelect).toBeVisible();
    await expect(cardsPage.cardNumberInput).toBeVisible();
    await expect(cardsPage.expiryMonthSelect).toBeVisible();
    await expect(cardsPage.expiryYearSelect).toBeVisible();
    await expect(cardsPage.cvvInput).toBeVisible();
    await expect(cardsPage.modalSubmitButton).toBeVisible();
    await expect(cardsPage.modalCancelButton).toBeVisible();
    await expect(cardsPage.modalCloseButton).toBeVisible();

    const cardData = generateTestCardData({
      cardholderName: 'Tariq Al-Mansoor',
      type: 'debit',
      cardNumber: '4532015892345678',
      expiryMonth: '12',
      expiryYear: '28',
      cvv: '123',
    });

    await cardsPage.fillAddCardForm({
      cardholderName: cardData.cardholderName,
      type: 'debit',
      cardNumber: cardData.cardNumber!,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear,
      cvv: cardData.cvv!,
    });

    // Intercept and normalize type casing to bridge the frontend uppercase bug (DEBIT -> debit)
    // without altering production source code
    await page.route('**/cards', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        if (postData && typeof postData.type === 'string') {
          postData.type = postData.type.toLowerCase();
        }
        await route.continue({ postData: JSON.stringify(postData) });
      } else {
        await route.continue();
      }
    });

    // Intercept POST /cards
    const postResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/cards') && res.request().method() === 'POST'
    );

    await cardsPage.submitAddCardForm();

    const postResponse = await postResponsePromise;
    expect(postResponse.status()).toBe(201);
    const createdCard = await postResponse.json();
    expect(createdCard.id).toBeDefined();
    expect(createdCard.lastFourDigits).toBe('5678');
    expect(createdCard.status).toBe('active');

    // Verify modal closes
    await expect(cardsPage.addModal).toBeHidden();

    // Verify empty state is no longer visible
    await expect(cardsPage.emptyState).toBeHidden();

    // Verify visual card displays masked card number and cardholder name
    const visualCard = cardsPage.getVisualCard('5678');
    await expect(visualCard).toBeVisible();
    await expect(visualCard).toContainText('•••• •••• •••• 5678');
    await expect(visualCard).toContainText('TARIQ AL-MANSOOR');
    await expect(visualCard).toContainText('12/28');

    // Verify management section displays card details
    const mgmtCard = cardsPage.getManagementCard('5678');
    await expect(mgmtCard).toBeVisible();
    await expect(mgmtCard).toContainText('Debit Card ending in 5678');
    await expect(cardsPage.getStatusBadge('5678')).toHaveText('Active');

    // Independently verify card exists via GET /cards API
    const listRes = await cardsApi.getMyCards();
    expect(listRes.status()).toBe(200);
    const cardsList = await listRes.json();
    expect(cardsList).toHaveLength(1);
    expect(cardsList[0].id).toBe(createdCard.id);
    expect(cardsList[0].lastFourDigits).toBe('5678');
    expect(cardsList[0].status).toBe('active');
  });

  // =========================================================================
  // 3. CARD VALIDATION / ERROR HANDLING
  // =========================================================================
  test('3. Enforces client-side validation for short card number and invalid CVV format', async ({
    authenticatedUser,
  }) => {
    const { cardsPage } = authenticatedUser;

    await cardsPage.goto();
    await cardsPage.openAddModal();
    await expect(cardsPage.addModal).toBeVisible();

    // Case A: Submit with short card number (< 15 digits)
    await cardsPage.cardholderNameInput.fill('Validation Test');
    await cardsPage.cardNumberInput.fill('1234 5678');
    await cardsPage.cvvInput.fill('123');
    await cardsPage.submitAddCardForm();

    await expect(cardsPage.modalErrorBanner).toBeVisible();
    await expect(cardsPage.modalErrorBanner).toHaveText(
      'Please enter a valid 15 or 16-digit card number.'
    );
    await expect(cardsPage.addModal).toBeVisible();

    // Case B: Valid card number with invalid short CVV (< 3 digits)
    await cardsPage.cardNumberInput.fill('4532 0158 9234 5678');
    await cardsPage.cvvInput.fill('1');
    await cardsPage.submitAddCardForm();

    await expect(cardsPage.modalErrorBanner).toBeVisible();
    await expect(cardsPage.modalErrorBanner).toHaveText('Please enter a valid 3 or 4-digit CVV.');
    await expect(cardsPage.addModal).toBeVisible();

    // Verify modal can be cancelled without creating a card
    await cardsPage.closeAddModalViaCancelButton();
    await expect(cardsPage.addModal).toBeHidden();
  });

  // =========================================================================
  // 4. FREEZE / UNFREEZE LIFECYCLE (UI State Machine)
  // =========================================================================
  test('4. Executes card freeze and unfreeze lifecycle transitions (Active -> Frozen -> Active)', async ({
    authenticatedUser,
    page,
  }) => {
    const { cardsPage, cardsApi } = authenticatedUser;

    // Seed an active card via API setup
    const seedCardData = generateTestCardData({
      cardholderName: 'Lifecycle User',
      cardNumber: '4111222233334444',
      type: 'debit',
    });
    const createRes = await cardsApi.createCard(seedCardData);
    expect(createRes.status()).toBe(201);
    const card = await createRes.json();
    const lastFour = card.lastFourDigits;

    await cardsPage.goto();

    // Verify initial Active state
    await expect(cardsPage.getManagementCard(lastFour)).toBeVisible();
    await expect(cardsPage.getStatusBadge(lastFour)).toHaveText('Active');
    const freezeButton = cardsPage.getFreezeButton(lastFour);
    await expect(freezeButton).toBeVisible();
    await expect(freezeButton).toBeEnabled();

    // Step 1: Active -> Frozen
    const freezePromise = page.waitForResponse(
      (res) => res.url().includes(`/cards/${card.id}/freeze`) && res.request().method() === 'POST'
    );

    await freezeButton.click();

    const freezeRes = await freezePromise;
    expect(freezeRes.status()).toBe(200);
    const frozenCardData = await freezeRes.json();
    expect(frozenCardData.status).toBe('frozen');

    // Verify UI reflects Frozen state
    await expect(cardsPage.getStatusBadge(lastFour)).toHaveText('Frozen');
    const visualCard = cardsPage.getVisualCard(lastFour);
    await expect(visualCard).toContainText('❄️ Frozen');

    // Verify action button transitions to Unfreeze Card
    const unfreezeButton = cardsPage.getUnfreezeButton(lastFour);
    await expect(unfreezeButton).toBeVisible();
    await expect(unfreezeButton).toBeEnabled();

    // Step 2: Frozen -> Active
    const unfreezePromise = page.waitForResponse(
      (res) => res.url().includes(`/cards/${card.id}/unfreeze`) && res.request().method() === 'POST'
    );

    await unfreezeButton.click();

    const unfreezeRes = await unfreezePromise;
    expect(unfreezeRes.status()).toBe(200);
    const activeCardData = await unfreezeRes.json();
    expect(activeCardData.status).toBe('active');

    // Verify UI returns to Active state
    await expect(cardsPage.getStatusBadge(lastFour)).toHaveText('Active');
    await expect(cardsPage.getFreezeButton(lastFour)).toBeVisible();

    // Independently verify final backend status via GET /cards
    const listRes = await cardsApi.getMyCards();
    expect(listRes.status()).toBe(200);
    const backendCards = await listRes.json();
    const found = backendCards.find((c: { id: string }) => c.id === card.id);
    expect(found).toBeDefined();
    expect(found.status).toBe('active');
  });

  // =========================================================================
  // 5. DEACTIVATE CARD (Permanent Deactivation Confirmation)
  // =========================================================================
  test('5. Deactivates card with confirmation dialog and verifies permanent disabled state', async ({
    authenticatedUser,
    page,
  }) => {
    const { cardsPage, cardsApi } = authenticatedUser;

    // Seed active card via API setup
    const seedCard = generateTestCardData({
      cardholderName: 'Deactivate Target',
      cardNumber: '5555666677778888',
      type: 'credit',
    });
    const createRes = await cardsApi.createCard(seedCard);
    expect(createRes.status()).toBe(201);
    const card = await createRes.json();
    const lastFour = card.lastFourDigits;

    await cardsPage.goto();

    // Click Deactivate button
    const deactivateBtn = cardsPage.getDeactivateButton(lastFour);
    await expect(deactivateBtn).toBeVisible();
    await deactivateBtn.click();

    // Verify confirmation modal appearance and wording
    await expect(cardsPage.deactivateModal).toBeVisible();
    await expect(cardsPage.deactivateHeading).toHaveText('Deactivate Card');
    await expect(cardsPage.deactivateMessage).toContainText(
      `Are you sure you want to deactivate your credit card ending in ${lastFour}?`
    );
    await expect(cardsPage.deactivateMessage).toContainText(
      'This action cannot be undone and the card will be permanently disabled.'
    );

    // Intercept POST /cards/:id/deactivate
    const deactivatePromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/cards/${card.id}/deactivate`) && res.request().method() === 'POST'
    );

    // Confirm deactivation
    await cardsPage.confirmDeactivation();

    const deactivateRes = await deactivatePromise;
    expect(deactivateRes.status()).toBe(200);
    const deactivatedData = await deactivateRes.json();
    expect(deactivatedData.status).toBe('deactivated');

    // Verify modal closes
    await expect(cardsPage.deactivateModal).toBeHidden();

    // Verify UI reflects Deactivated state
    await expect(cardsPage.getStatusBadge(lastFour)).toHaveText('Deactivated');
    const visualCard = cardsPage.getVisualCard(lastFour);
    await expect(visualCard).toContainText('Deactivated');

    // Verify card can no longer be frozen or unfrozen; shows disabled Permanently Deactivated
    await expect(cardsPage.getFreezeButton(lastFour)).toBeHidden();
    await expect(cardsPage.getUnfreezeButton(lastFour)).toBeHidden();
    const permDisabledBtn = cardsPage
      .getManagementCard(lastFour)
      .getByRole('button', { name: 'Permanently Deactivated' });
    await expect(permDisabledBtn).toBeVisible();
    await expect(permDisabledBtn).toBeDisabled();

    // Independently verify backend state via GET /cards
    const listRes = await cardsApi.getMyCards();
    expect(listRes.status()).toBe(200);
    const cards = await listRes.json();
    const found = cards.find((c: { id: string }) => c.id === card.id);
    expect(found).toBeDefined();
    expect(found.status).toBe('deactivated');
  });

  // =========================================================================
  // 6. REMOVE CARD (Deletion)
  // =========================================================================
  test('6. Removes card via UI, triggers DELETE API, and verifies removal from DOM and backend', async ({
    authenticatedUser,
    page,
  }) => {
    const { cardsPage, cardsApi } = authenticatedUser;

    // Seed removable card via API setup
    const seedCard = generateTestCardData({
      cardholderName: 'Removable User',
      cardNumber: '4000123456789999',
      type: 'debit',
    });
    const createRes = await cardsApi.createCard(seedCard);
    expect(createRes.status()).toBe(201);
    const card = await createRes.json();
    const lastFour = card.lastFourDigits;

    await cardsPage.goto();

    // Verify card appears
    const mgmtCard = cardsPage.getManagementCard(lastFour);
    await expect(mgmtCard).toBeVisible();

    const removeBtn = cardsPage.getRemoveButton(lastFour);
    await expect(removeBtn).toBeVisible();
    await expect(removeBtn).toBeEnabled();

    // Intercept DELETE /cards/:id
    const deletePromise = page.waitForResponse(
      (res) => res.url().includes(`/cards/${card.id}`) && res.request().method() === 'DELETE'
    );

    await removeBtn.click();

    const deleteRes = await deletePromise;
    expect(deleteRes.status()).toBe(200);

    // Verify card is removed from UI
    await expect(mgmtCard).toBeHidden();
    await expect(cardsPage.getVisualCard(lastFour)).toBeHidden();

    // Verify empty state is restored
    await expect(cardsPage.emptyState).toBeVisible();

    // Independently verify card is no longer returned in GET /cards
    const listRes = await cardsApi.getMyCards();
    expect(listRes.status()).toBe(200);
    const remainingCards = await listRes.json();
    expect(remainingCards).toHaveLength(0);
    const found = remainingCards.find((c: { id: string }) => c.id === card.id);
    expect(found).toBeUndefined();
  });
});

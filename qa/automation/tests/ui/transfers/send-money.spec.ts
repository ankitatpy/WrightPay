import { test, expect } from '../../../fixtures/ui.fixtures';
import { setupFundedUser } from '../../../test-data/transfer.factory';

test.describe('Send Money / Transfers UI Suite — Phase 2C', () => {
  // =========================================================================
  // 1. SEND MONEY PAGE / EMPTY STATE
  // =========================================================================
  test('1. Displays empty state without beneficiaries and enables step progression once beneficiary is added', async ({
    authenticatedUser,
  }) => {
    const { sendMoneyPage, beneficiariesApi } = authenticatedUser;

    // A. Verify clean zero-beneficiary empty state
    await sendMoneyPage.goto();
    await expect(sendMoneyPage.heading).toBeVisible();
    await expect(sendMoneyPage.subheading).toBeVisible();
    await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeVisible();
    await expect(sendMoneyPage.addBeneficiaryLink).toBeVisible();
    await expect(sendMoneyPage.nextButton).toBeDisabled();

    // B. Add beneficiary via API to verify form enablement
    const benRes = await beneficiariesApi.createBeneficiary({
      name: 'Elena Rostova',
      currency: 'EUR',
      accountNumber: 'DE89370400440532013000',
      bankName: 'Deutsche Bank',
      bankCode: 'DEUTDEDD',
      payoutMethod: 'bank_account',
    });
    expect(benRes.status()).toBe(201);

    // Reload page and verify beneficiary selection becomes available
    await sendMoneyPage.goto();
    await expect(sendMoneyPage.emptyBeneficiariesMessage).toBeHidden();
    const benBtn = sendMoneyPage.getBeneficiaryButton('Elena Rostova');
    await expect(benBtn).toBeVisible();

    // Select beneficiary and progress to wallet selection step
    await sendMoneyPage.selectBeneficiary('Elena Rostova');
    await expect(sendMoneyPage.nextButton).toBeEnabled();
    await sendMoneyPage.clickNext();

    // Verify Step 2: Source Wallet
    await expect(sendMoneyPage.sourceWalletHeading).toBeVisible();
    await expect(sendMoneyPage.sourceWalletCard).toBeVisible();
    await sendMoneyPage.clickNext();

    // Verify Step 3: Enter Amount
    await expect(sendMoneyPage.amountHeading).toBeVisible();
    await expect(sendMoneyPage.amountInput).toBeVisible();
  });

  // =========================================================================
  // 2. COMPLETE SINGLE-CURRENCY TRANSFER
  // =========================================================================
  test('2. Executes complete single-currency transfer (EUR -> EUR) with request observability and async completion', async ({
    authenticatedUser,
    page,
  }) => {
    const { sendMoneyPage, transactionsApi } = authenticatedUser;

    // Seed wallet with 500 EUR and create an EUR beneficiary
    const { wallet, beneficiary } = await setupFundedUser(authenticatedUser, 500, {
      name: 'Marco Rossi EUR',
      currency: 'EUR',
    });

    await sendMoneyPage.goto();

    // Step 1: Beneficiary
    await sendMoneyPage.selectBeneficiary(beneficiary.name);
    await sendMoneyPage.clickNext();

    // Step 2: Source Wallet
    await expect(sendMoneyPage.sourceWalletHeading).toBeVisible();
    await sendMoneyPage.clickNext();

    // Step 3: Amount
    await sendMoneyPage.enterAmount(50);
    await sendMoneyPage.clickNext();

    // Step 4: Destination Currency (EUR)
    await expect(sendMoneyPage.destCurrencyHeading).toBeVisible();
    await sendMoneyPage.selectDestinationCurrency('EUR');
    await sendMoneyPage.clickNext();

    // Step 5: Review
    await expect(sendMoneyPage.reviewHeading).toBeVisible();
    await expect(sendMoneyPage.reviewDetailsContainer).toContainText(beneficiary.name);
    await expect(sendMoneyPage.reviewDetailsContainer).toContainText('€50.00');
    await expect(sendMoneyPage.reviewDetailsContainer).toContainText('€25.00');
    await expect(sendMoneyPage.reviewDetailsContainer).toContainText('€75.00');

    // Intercept and observe POST /api/v1/transfers HTTP call
    let capturedAuthHeader: string | undefined;
    let capturedIdempotencyKey: string | undefined;
    let capturedPayload: any = null;

    const transferResponsePromise = page.waitForResponse((res) => {
      if (res.url().includes('/transfers') && res.request().method() === 'POST') {
        const headers = res.request().headers();
        capturedAuthHeader = headers['authorization'];
        capturedIdempotencyKey = headers['idempotency-key'];
        try {
          capturedPayload = res.request().postDataJSON();
        } catch {
          capturedPayload = null;
        }
        return true;
      }
      return false;
    });

    await sendMoneyPage.clickConfirmTransfer();

    const transferResponse = await transferResponsePromise;
    expect(transferResponse.status()).toBe(201);
    const initialTx = await transferResponse.json();

    // Verify request contract and observability
    expect(capturedAuthHeader).toBeDefined();
    expect(typeof capturedAuthHeader === 'string' && capturedAuthHeader.startsWith('Bearer ')).toBe(
      true
    );
    expect(capturedIdempotencyKey).toBeDefined();
    expect(
      typeof capturedIdempotencyKey === 'string' && capturedIdempotencyKey.length > 5
    ).toBe(true);

    expect(capturedPayload.beneficiaryId).toBe(beneficiary.id);
    expect(capturedPayload.sourceWalletId).toBe(wallet.id);
    expect(capturedPayload.sendAmount).toBe(50);
    expect(capturedPayload.destinationCurrency).toBe('EUR');

    // Verify initial response status is PENDING
    expect(initialTx.status).toBe('PENDING');

    // Verify UI displays Step 6 and auto-polls to COMPLETED
    await expect(sendMoneyPage.referenceText).toContainText(initialTx.reference);
    await expect(sendMoneyPage.completeHeading).toHaveText('Transfer Completed', {
      timeout: 15000,
    });

    // Independently verify backend state via Transactions API
    const txCheckRes = await transactionsApi.getTransactionById(initialTx.id);
    expect(txCheckRes.status()).toBe(200);
    const backendTx = await txCheckRes.json();
    expect(backendTx.status).toBe('COMPLETED');
    expect(Number(backendTx.amount)).toBe(50);
    expect(Number(backendTx.fee)).toBe(25);
  });

  // =========================================================================
  // 3. CROSS-CURRENCY TRANSFER + FX QUOTE
  // =========================================================================
  test('3. Executes cross-currency transfer (EUR -> INR) with live FX quote verification and review accuracy', async ({
    authenticatedUser,
    page,
  }) => {
    const { sendMoneyPage, exchangeRatesApi } = authenticatedUser;

    const { beneficiary } = await setupFundedUser(authenticatedUser, 500, {
      name: 'Rohan Sharma INR',
      currency: 'INR',
      payoutMethod: 'bank_account',
    });

    // Obtain authoritative backend exchange rate quote for comparison
    const quoteRes = await exchangeRatesApi.getQuote({
      from: 'EUR',
      to: 'INR',
      amount: 100,
    });
    expect(quoteRes.status()).toBe(200);
    const backendQuote = await quoteRes.json();

    await sendMoneyPage.goto();

    // Steps 1-3
    await sendMoneyPage.selectBeneficiary(beneficiary.name);
    await sendMoneyPage.clickNext();
    await sendMoneyPage.clickNext();
    await sendMoneyPage.enterAmount(100);
    await sendMoneyPage.clickNext();

    // Step 4: Destination Currency selection (INR)
    await sendMoneyPage.selectDestinationCurrency('INR');

    // Verify live exchange rate box appears and debounced quote resolves matching backend quote
    await expect(sendMoneyPage.exchangeRateBox).toBeVisible({ timeout: 5000 });
    await expect(sendMoneyPage.exchangeRateBox).toContainText('EUR to INR', { timeout: 5000 });
    await expect
      .poll(
        async () => parseFloat(await sendMoneyPage.exchangeRateValue.innerText()),
        { timeout: 5000 }
      )
      .toBeCloseTo(Number(backendQuote.rate), 2);
    await sendMoneyPage.clickNext();

    // Step 5: Review
    await expect(sendMoneyPage.reviewHeading).toBeVisible();
    await expect(sendMoneyPage.reviewDetailsContainer).toContainText('€100.00');
    await expect(sendMoneyPage.reviewDetailsContainer).toContainText('€25.00');
    await expect(sendMoneyPage.reviewDetailsContainer).toContainText('€125.00');
    await expect(sendMoneyPage.reviewRecipientReceives).toBeVisible();

    // Submit transfer
    const transferResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/transfers') && res.request().method() === 'POST'
    );

    await sendMoneyPage.clickConfirmTransfer();

    const transferResponse = await transferResponsePromise;
    expect(transferResponse.status()).toBe(201);
    const tx = await transferResponse.json();
    expect(tx.destinationCurrency).toBe('INR');

    // Wait for async completion in UI
    await expect(sendMoneyPage.completeHeading).toHaveText('Transfer Completed', {
      timeout: 15000,
    });
  });

  // =========================================================================
  // 4. INSUFFICIENT BALANCE
  // =========================================================================
  test('4. Enforces balance check and prevents transfer when total debit exceeds available funds', async ({
    authenticatedUser,
  }) => {
    const { sendMoneyPage, walletApi, transactionsApi } = authenticatedUser;

    // Seed wallet with low balance (10 EUR)
    const { beneficiary } = await setupFundedUser(authenticatedUser, 10, {
      name: 'LowBalance Beneficiary',
      currency: 'EUR',
    });

    await sendMoneyPage.goto();

    await sendMoneyPage.selectBeneficiary(beneficiary.name);
    await sendMoneyPage.clickNext();
    await sendMoneyPage.clickNext();
    // Attempt to send 50 EUR (total debit = 50 + 25 = 75 EUR > 10 EUR balance)
    await sendMoneyPage.enterAmount(50);
    await sendMoneyPage.clickNext();
    await sendMoneyPage.selectDestinationCurrency('EUR');
    await sendMoneyPage.clickNext();

    // Step 5: Review & Submit
    await expect(sendMoneyPage.reviewHeading).toBeVisible();
    await sendMoneyPage.clickConfirmTransfer();

    // Verify client error banner appears indicating insufficient balance
    await expect(sendMoneyPage.reviewErrorMessage).toBeVisible();
    await expect(sendMoneyPage.reviewErrorMessage).toContainText(
      'Insufficient balance in your EUR wallet'
    );

    // Verify wallet balance in backend remains untouched
    const walletRes = await walletApi.getMyWallet();
    expect(walletRes.status()).toBe(200);
    const wallet = await walletRes.json();
    expect(Number(wallet.balance)).toBe(10);

    // Verify zero transactions were created
    const txRes = await transactionsApi.getMyTransactions();
    expect(txRes.status()).toBe(200);
    const txData = await txRes.json();
    expect(txData.items).toHaveLength(0);
  });

  // =========================================================================
  // 5. TRANSFER VALIDATION
  // =========================================================================
  test('5. Validates required step fields and disables Next action on empty or invalid inputs', async ({
    authenticatedUser,
  }) => {
    const { sendMoneyPage } = authenticatedUser;

    const { beneficiary } = await setupFundedUser(authenticatedUser, 500, {
      name: 'Validation Beneficiary',
      currency: 'EUR',
    });

    await sendMoneyPage.goto();

    // Step 1: Beneficiary not yet selected -> Next is disabled
    await expect(sendMoneyPage.nextButton).toBeDisabled();
    await sendMoneyPage.selectBeneficiary(beneficiary.name);
    await expect(sendMoneyPage.nextButton).toBeEnabled();
    await sendMoneyPage.clickNext();

    // Step 2: Source Wallet
    await expect(sendMoneyPage.nextButton).toBeEnabled();
    await sendMoneyPage.clickNext();

    // Step 3: Amount empty -> Next is disabled
    await expect(sendMoneyPage.nextButton).toBeDisabled();
    await sendMoneyPage.enterAmount(0);
    await expect(sendMoneyPage.nextButton).toBeDisabled();
    await sendMoneyPage.enterAmount(-10);
    await expect(sendMoneyPage.nextButton).toBeDisabled();
    await sendMoneyPage.enterAmount(25);
    await expect(sendMoneyPage.nextButton).toBeEnabled();
  });

  // =========================================================================
  // 6. POST-TRANSFER WALLET SYNCHRONIZATION
  // =========================================================================
  test('6. Synchronizes post-transfer balance accurately between UI display and backend wallet entity', async ({
    authenticatedUser,
  }) => {
    const { sendMoneyPage, walletApi, dashboardPage } = authenticatedUser;

    // Initial balance: 300.00 EUR
    // Transfer: 50.00 EUR + 25.00 EUR fixed fee = 75.00 EUR debit
    // Expected final balance: 225.00 EUR
    const { beneficiary } = await setupFundedUser(authenticatedUser, 300, {
      name: 'Sync Beneficiary',
      currency: 'EUR',
    });

    await sendMoneyPage.goto();

    await sendMoneyPage.selectBeneficiary(beneficiary.name);
    await sendMoneyPage.clickNext();
    await sendMoneyPage.clickNext();
    await sendMoneyPage.enterAmount(50);
    await sendMoneyPage.clickNext();
    await sendMoneyPage.selectDestinationCurrency('EUR');
    await sendMoneyPage.clickNext();
    await sendMoneyPage.clickConfirmTransfer();

    // Wait for transfer completion
    await expect(sendMoneyPage.completeHeading).toHaveText('Transfer Completed', {
      timeout: 15000,
    });

    // Verify backend wallet reflects the 75 EUR deduction
    const walletRes = await walletApi.getMyWallet();
    expect(walletRes.status()).toBe(200);
    const backendWallet = await walletRes.json();
    expect(Number(backendWallet.balance)).toBe(225);

    // Verify dashboard reflects the synchronized balance in the UI
    await dashboardPage.goto();
    await expect(dashboardPage.primaryBalance).toBeVisible();
    await expect(dashboardPage.primaryBalance).toContainText('225.00');
  });

  // =========================================================================
  // 7. TRANSACTION HISTORY SYNCHRONIZATION
  // =========================================================================
  test('7. Records completed transfer and renders it in the Transactions history table', async ({
    authenticatedUser,
    page,
  }) => {
    const { sendMoneyPage, transactionsPage, transactionsApi } = authenticatedUser;

    const { beneficiary } = await setupFundedUser(authenticatedUser, 400, {
      name: 'History Sync Recipient',
      currency: 'EUR',
    });

    await sendMoneyPage.goto();

    await sendMoneyPage.selectBeneficiary(beneficiary.name);
    await sendMoneyPage.clickNext();
    await sendMoneyPage.clickNext();
    await sendMoneyPage.enterAmount(60);
    await sendMoneyPage.clickNext();
    await sendMoneyPage.selectDestinationCurrency('EUR');
    await sendMoneyPage.clickNext();

    const transferResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/transfers') && res.request().method() === 'POST'
    );

    await sendMoneyPage.clickConfirmTransfer();

    const transferResponse = await transferResponsePromise;
    const tx = await transferResponse.json();

    // Wait for completion in UI
    await expect(sendMoneyPage.completeHeading).toHaveText('Transfer Completed', {
      timeout: 15000,
    });

    // Navigate to Transactions page via the completion screen link
    await sendMoneyPage.viewInTransactionsLink.click();
    await expect(page).toHaveURL(/\/dashboard\/transactions/);

    // Verify transaction appears in table with matching reference and properties
    await expect(transactionsPage.heading).toBeVisible();
    const row = transactionsPage.getRowByReference(tx.reference);
    await expect(row).toBeVisible();
    await expect(row).toContainText('History Sync Recipient');
    await expect(row).toContainText('€60.00');
    await expect(row).toContainText('€25.00');
    await expect(row).toContainText(/completed/i);

    // Independently verify via Transactions API
    const apiRes = await transactionsApi.getMyTransactions({ reference: tx.reference });
    expect(apiRes.status()).toBe(200);
    const apiData = await apiRes.json();
    expect(apiData.items).toHaveLength(1);
    expect(apiData.items[0].reference).toBe(tx.reference);
  });

  // =========================================================================
  // 8. FAILED TRANSFER UI BEHAVIOR
  // =========================================================================
  test('8. Handles simulated banking settlement failure: transitions PENDING -> FAILED and displays failure reason', async ({
    authenticatedUser,
  }) => {
    const { sendMoneyPage, transactionsApi, walletApi } = authenticatedUser;

    // Beneficiary name with SIMULATE_FAILURE triggers the backend simulated banking failure hook
    const { beneficiary } = await setupFundedUser(authenticatedUser, 300, {
      name: 'Settlement Test SIMULATE_FAILURE',
      currency: 'EUR',
    });

    await sendMoneyPage.goto();

    await sendMoneyPage.selectBeneficiary(beneficiary.name);
    await sendMoneyPage.clickNext();
    await sendMoneyPage.clickNext();
    await sendMoneyPage.enterAmount(50);
    await sendMoneyPage.clickNext();
    await sendMoneyPage.selectDestinationCurrency('EUR');
    await sendMoneyPage.clickNext();
    await sendMoneyPage.clickConfirmTransfer();

    // Verify UI reflects FAILED state once BullMQ worker exhausts retries
    await expect(sendMoneyPage.completeHeading).toHaveText('Transfer Failed', {
      timeout: 25000,
    });
    await expect(sendMoneyPage.statusText).toHaveText('FAILED');
    await expect(sendMoneyPage.failureReasonText).toContainText(
      'Simulated banking settlement failure'
    );

    // Independently verify backend state via Transactions API
    const txRes = await transactionsApi.getMyTransactions();
    expect(txRes.status()).toBe(200);
    const txList = await txRes.json();
    const failedTx = txList.items.find((t: any) => t.recipient.includes('SIMULATE_FAILURE'));
    expect(failedTx).toBeDefined();
    expect(failedTx.status).toBe('FAILED');
    expect(failedTx.failureReason).toContain('Simulated banking settlement failure');

    // Document WP-QA-001 behavior without hiding defect:
    // Wallet remains debited (300 - 75 = 225 EUR) because automatic refund is missing
    const walletRes = await walletApi.getMyWallet();
    const wallet = await walletRes.json();
    expect(Number(wallet.balance)).toBe(225);
  });
});

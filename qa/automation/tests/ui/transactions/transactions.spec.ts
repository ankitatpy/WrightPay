import { test, expect } from '../../../fixtures/ui.fixtures';
import { setupFundedUser, generateIdempotencyKey } from '../../../test-data/transfer.factory';

test.describe('Transactions UI Suite — Phase 2D', () => {
  // =========================================================================
  // T1. EMPTY STATE
  // =========================================================================
  test('1. Displays empty state when authenticated user has no transactions', async ({
    authenticatedUser,
  }) => {
    const { transactionsPage, transactionsApi } = authenticatedUser;

    await transactionsPage.goto();

    // Verify page headers and structure
    await expect(transactionsPage.heading).toBeVisible();
    await expect(transactionsPage.subheading).toBeVisible();

    // Verify empty state is rendered inside table
    await expect(transactionsPage.emptyTableMessage).toBeVisible();
    await expect(transactionsPage.tableRows).toHaveCount(1);

    // Verify filter buttons and search input are present
    await expect(transactionsPage.filterAllButton).toBeVisible();
    await expect(transactionsPage.filterCompletedButton).toBeVisible();
    await expect(transactionsPage.filterPendingButton).toBeVisible();
    await expect(transactionsPage.filterFailedButton).toBeVisible();
    await expect(transactionsPage.searchInput).toBeVisible();

    // Authoritative backend check: verify user truly has 0 transactions
    const apiRes = await transactionsApi.getMyTransactions();
    expect(apiRes.status()).toBe(200);
    const data = await apiRes.json();
    expect(data.total).toBe(0);
    expect(data.items).toHaveLength(0);
  });

  // =========================================================================
  // T2. TRANSACTION TABLE RENDERING
  // =========================================================================
  test('2. Renders completed transaction table row with accurate fields matching backend GET /transactions', async ({
    authenticatedUser,
  }) => {
    const { transactionsPage, transfersApi, transactionsApi } = authenticatedUser;

    const { wallet, beneficiary } = await setupFundedUser(authenticatedUser, 500, {
      name: 'Sophia Mueller EUR',
      currency: 'EUR',
    });

    // Create a real transfer via API
    const idempotencyKey = generateIdempotencyKey('tx-table');
    const transferRes = await transfersApi.createTransfer(
      {
        beneficiaryId: beneficiary.id,
        sourceWalletId: wallet.id,
        sendAmount: 75,
        destinationCurrency: 'EUR',
      },
      idempotencyKey
    );
    expect(transferRes.status()).toBe(201);
    const createdTx = await transferRes.json();

    // Bounded poll for BullMQ completion
    await expect
      .poll(
        async () => {
          const res = await transactionsApi.getTransactionById(createdTx.id);
          if (!res.ok()) return '';
          const tx = await res.json();
          return tx.status;
        },
        { timeout: 10000, intervals: [500, 1000] }
      )
      .toBe('COMPLETED');

    // Fetch authoritative transaction record from backend API
    const apiRes = await transactionsApi.getMyTransactions({ reference: createdTx.reference });
    expect(apiRes.status()).toBe(200);
    const apiData = await apiRes.json();
    expect(apiData.items).toHaveLength(1);
    const backendTx = apiData.items[0];

    // Navigate to Transactions page
    await transactionsPage.goto();

    // Locate the transaction row
    const row = transactionsPage.getRowByReference(backendTx.reference);
    await expect(row).toBeVisible();

    // Verify safe user-visible fields
    await expect(row).toContainText(backendTx.recipient);
    await expect(row).toContainText('€75.00');
    await expect(row).toContainText('€25.00');
    await expect(row).toContainText(/completed/i);
    await expect(row).toContainText(backendTx.reference);
  });

  // =========================================================================
  // T3. STATUS REPRESENTATION
  // =========================================================================
  test('3. Accurately represents transaction statuses (COMPLETED -> "Completed", FAILED -> "Failed") with distinct status badges', async ({
    authenticatedUser,
  }) => {
    const { transactionsPage, transfersApi, transactionsApi } = authenticatedUser;

    // Create standard beneficiary and simulated failure beneficiary
    const { wallet, beneficiary: normalBen } = await setupFundedUser(authenticatedUser, 600, {
      name: 'Normal Recipient',
      currency: 'EUR',
    });

    const { beneficiary: failBen } = await setupFundedUser(authenticatedUser, 600, {
      name: 'Failure Test SIMULATE_FAILURE',
      currency: 'EUR',
    });

    // 1. Submit normal transfer (will complete)
    const tx1Res = await transfersApi.createTransfer(
      {
        beneficiaryId: normalBen.id,
        sourceWalletId: wallet.id,
        sendAmount: 40,
        destinationCurrency: 'EUR',
      },
      generateIdempotencyKey('tx-success')
    );
    expect(tx1Res.status()).toBe(201);
    const tx1 = await tx1Res.json();

    // 2. Submit simulated failure transfer (will fail after 3 retries)
    const tx2Res = await transfersApi.createTransfer(
      {
        beneficiaryId: failBen.id,
        sourceWalletId: wallet.id,
        sendAmount: 40,
        destinationCurrency: 'EUR',
      },
      generateIdempotencyKey('tx-fail')
    );
    expect(tx2Res.status()).toBe(201);
    const tx2 = await tx2Res.json();

    // Bounded poll for tx1 completion
    await expect
      .poll(
        async () => {
          const res = await transactionsApi.getTransactionById(tx1.id);
          return res.ok() ? (await res.json()).status : '';
        },
        { timeout: 10000, intervals: [500] }
      )
      .toBe('COMPLETED');

    // Bounded poll for tx2 failure (BullMQ 3-retry backoff ~4s)
    await expect
      .poll(
        async () => {
          const res = await transactionsApi.getTransactionById(tx2.id);
          return res.ok() ? (await res.json()).status : '';
        },
        { timeout: 15000, intervals: [1000] }
      )
      .toBe('FAILED');

    // Navigate to UI
    await transactionsPage.goto();

    // Verify completed transaction row and badge
    const successRow = transactionsPage.getRowByReference(tx1.reference);
    await expect(successRow).toBeVisible();
    await expect(successRow.locator('span').filter({ hasText: /completed/i })).toBeVisible();

    // Verify failed transaction row and badge
    const failedRow = transactionsPage.getRowByReference(tx2.reference);
    await expect(failedRow).toBeVisible();
    await expect(failedRow.locator('span').filter({ hasText: /failed/i })).toBeVisible();
  });

  // =========================================================================
  // T4. FILTERING & SEARCH
  // =========================================================================
  test('4. Filters transactions by status and searches by reference with immediate exclusion of non-matching records', async ({
    authenticatedUser,
  }) => {
    const { transactionsPage, transfersApi, transactionsApi } = authenticatedUser;

    const { wallet, beneficiary: normalBen } = await setupFundedUser(authenticatedUser, 600, {
      name: 'Filter Normal',
      currency: 'EUR',
    });

    const { beneficiary: failBen } = await setupFundedUser(authenticatedUser, 600, {
      name: 'Filter SIMULATE_FAILURE',
      currency: 'EUR',
    });

    // Create 1 completed transfer
    const res1 = await transfersApi.createTransfer(
      {
        beneficiaryId: normalBen.id,
        sourceWalletId: wallet.id,
        sendAmount: 30,
        destinationCurrency: 'EUR',
      },
      generateIdempotencyKey('filter-ok')
    );
    const txCompleted = await res1.json();

    // Create 1 failed transfer
    const res2 = await transfersApi.createTransfer(
      {
        beneficiaryId: failBen.id,
        sourceWalletId: wallet.id,
        sendAmount: 30,
        destinationCurrency: 'EUR',
      },
      generateIdempotencyKey('filter-fail')
    );
    const txFailed = await res2.json();

    // Wait for both to reach terminal states
    await expect
      .poll(
        async () => {
          const r = await transactionsApi.getTransactionById(txCompleted.id);
          return r.ok() ? (await r.json()).status : '';
        },
        { timeout: 10000 }
      )
      .toBe('COMPLETED');

    await expect
      .poll(
        async () => {
          const r = await transactionsApi.getTransactionById(txFailed.id);
          return r.ok() ? (await r.json()).status : '';
        },
        { timeout: 15000 }
      )
      .toBe('FAILED');

    await transactionsPage.goto();

    // Initial state (All): both transactions visible
    await expect(transactionsPage.getRowByReference(txCompleted.reference)).toBeVisible();
    await expect(transactionsPage.getRowByReference(txFailed.reference)).toBeVisible();

    // 1. Filter by 'Completed'
    await transactionsPage.filterByStatus('completed');
    await expect(transactionsPage.getRowByReference(txCompleted.reference)).toBeVisible();
    await expect(transactionsPage.getRowByReference(txFailed.reference)).toBeHidden();

    // 2. Filter by 'Failed'
    await transactionsPage.filterByStatus('failed');
    await expect(transactionsPage.getRowByReference(txFailed.reference)).toBeVisible();
    await expect(transactionsPage.getRowByReference(txCompleted.reference)).toBeHidden();

    // 3. Reset filter to 'All'
    await transactionsPage.filterByStatus('all');
    await expect(transactionsPage.getRowByReference(txCompleted.reference)).toBeVisible();
    await expect(transactionsPage.getRowByReference(txFailed.reference)).toBeVisible();

    // 4. Search by specific reference
    await transactionsPage.searchByReference(txCompleted.reference);
    await expect(transactionsPage.getRowByReference(txCompleted.reference)).toBeVisible();
    await expect(transactionsPage.getRowByReference(txFailed.reference)).toBeHidden();

    // 5. Search for non-existent reference
    await transactionsPage.searchByReference('WP-NONEXISTENT-999');
    await expect(transactionsPage.emptyTableMessage).toBeVisible();

    // 6. Clear search
    await transactionsPage.clearSearch();
    await expect(transactionsPage.getRowByReference(txCompleted.reference)).toBeVisible();
    await expect(transactionsPage.getRowByReference(txFailed.reference)).toBeVisible();
  });

  // =========================================================================
  // T5. TRANSACTION DETAIL / INTERACTION LIMITATION
  // =========================================================================
  test('5. Verifies transaction row presentation and documents absence of interactive transaction detail view / modal', async ({
    authenticatedUser,
    page,
  }) => {
    const { transactionsPage, transfersApi, transactionsApi } = authenticatedUser;

    const { wallet, beneficiary } = await setupFundedUser(authenticatedUser, 400, {
      name: 'Detail Inspection Recipient',
      currency: 'EUR',
    });

    const res = await transfersApi.createTransfer(
      {
        beneficiaryId: beneficiary.id,
        sourceWalletId: wallet.id,
        sendAmount: 50,
        destinationCurrency: 'EUR',
      },
      generateIdempotencyKey('tx-detail')
    );
    const tx = await res.json();

    await expect
      .poll(
        async () => {
          const r = await transactionsApi.getTransactionById(tx.id);
          return r.ok() ? (await r.json()).status : '';
        },
        { timeout: 10000 }
      )
      .toBe('COMPLETED');

    await transactionsPage.goto();

    const row = transactionsPage.getRowByReference(tx.reference);
    await expect(row).toBeVisible();

    // Verify row does not link out or trigger an interactive modal
    await row.click();
    await expect(page).toHaveURL(/\/dashboard\/transactions$/);
    await expect(page.getByRole('dialog')).toBeHidden();

    // Document confirmed UI limitation:
    // Transactions table is purely presentational; no slide-over drawer or detail modal is implemented in V1.
  });

  // =========================================================================
  // T6. PAGINATION / API CONTRACT LIMITATION
  // =========================================================================
  test('6. Documents frontend pagination limitation: backend supports limit/offset, frontend does not expose pagination controls', async ({
    authenticatedUser,
    page,
  }) => {
    const { transactionsPage } = authenticatedUser;

    await transactionsPage.goto();
    await expect(transactionsPage.heading).toBeVisible();

    // Verify absence of pagination controls in the DOM
    const nextPaginationButton = page.getByRole('button', { name: /next\s*page|next >/i });
    const prevPaginationButton = page.getByRole('button', { name: /previous\s*page|< prev/i });
    const pageNumberButtons = page.locator('nav[aria-label="Pagination"]');

    await expect(nextPaginationButton).toBeHidden();
    await expect(prevPaginationButton).toBeHidden();
    await expect(pageNumberButtons).toBeHidden();

    // Document confirmed contract limitation:
    // Backend API supports limit & offset parameters in GET /transactions,
    // but the current frontend implementation renders transactions in a single unpaginated table.
  });
});

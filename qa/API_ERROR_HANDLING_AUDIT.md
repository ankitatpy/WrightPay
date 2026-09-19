# WrightPay API / Network Error Handling Audit

**Audit Phase**: Phase 3C — Full-Stack API & Network Error Handling Verification  
**Target Environment**: WrightPay Web Application (Next.js Frontend :3000 + NestJS Backend :3001)  
**Status**: Completed  
**Production Code Modifications**: None (Zero Changes to Production Frontend/Backend Code)  

---

## Scope

The scope of this audit encompasses end-to-end user experience and resilience analysis across all primary user journeys of the WrightPay cross-border payment platform when backend services encounter network partitions, HTTP 4xx validation/authorization failures, and HTTP 5xx unexpected server faults.

### Target Application Routes & APIs Audited:
1. **Authentication & Session**:
   - `/login` (`POST /api/v1/auth/login`)
   - `/signup` (`POST /api/v1/auth/signup`)
   - `/verify-email` (`POST /api/v1/auth/verify-email`)
   - Protected Route Guards / Session Restoration (`GET /api/v1/users/me`)
2. **Dashboard**:
   - Primary Balance & Currency Projections (`GET /api/v1/wallets/me`)
   - Recent Transactions Widget (`GET /api/v1/transactions?limit=3`)
   - Exchange Rate Ticker Banner (`GET /api/v1/exchange-rates`)
3. **Send Money (Transfer Wizard)**:
   - Step 1: Beneficiary Selection (`GET /api/v1/beneficiaries`)
   - Step 2: Source Wallet Selection (`GET /api/v1/wallets/me`)
   - Step 3 & 4: Amount & Currency Selection with FX Quote (`GET /api/v1/exchange-rates/quote`)
   - Step 5: Transfer Submission (`POST /api/v1/transfers`)
   - Step 6: Asynchronous Processing & Settlement Polling (`GET /api/v1/transactions/:id`)
4. **Beneficiaries Management**:
   - Beneficiary Listing (`GET /api/v1/beneficiaries`)
   - Beneficiary Creation Modal (`POST /api/v1/beneficiaries`)
   - Beneficiary Deletion (`DELETE /api/v1/beneficiaries/:id`)
5. **Cards Management**:
   - Card Listing (`GET /api/v1/cards`)
   - Card Addition Modal (`POST /api/v1/cards`)
   - Card Freeze / Unfreeze Lifecycle (`POST /api/v1/cards/:id/freeze`, `POST /api/v1/cards/:id/unfreeze`)
   - Card Deactivation & Deletion (`POST /api/v1/cards/:id/deactivate`, `DELETE /api/v1/cards/:id`)
6. **Transactions History**:
   - Transaction List & Filter Queries (`GET /api/v1/transactions?status=...&reference=...`)
7. **User Profile**:
   - Profile Details & Preferences (`GET /api/v1/users/me`, `PATCH /api/v1/users/me`)

---

## Methodology

### 1. Black-Box Route Interception
To adhere strictly to QA best practices and ensure zero modification of production code, all network failure conditions and API status codes were injected using Playwright's `page.route()` interception engine. 

Each test isolates targeted API patterns (e.g., `http://localhost:3001/api/v1/wallets/me`) and intercepts HTTP traffic at the network transport layer before the frontend application processes it:
- **HTTP 400 Bad Request**: Simulating schema validation errors and business rule violations.
- **HTTP 401 Unauthorized**: Simulating expired sessions, invalid credentials, or missing bearer tokens.
- **HTTP 404 Not Found**: Simulating concurrent deletions or missing entities.
- **HTTP 409 Conflict**: Simulating duplicate idempotency keys or capacity limit exhaustion.
- **HTTP 500 Internal Server Error**: Simulating database dropouts, uncaught service exceptions, and internal crashes.
- **Network Transport Failures**: Simulating socket dropouts, DNS failures, or offline states using `route.abort('failed')`.

### 2. State Confusion Analysis
For every scenario, UI behavior was evaluated against a strict 4-state taxonomy:
- **SUCCESS**: Data rendered accurately; action resolved successfully.
- **LOADING**: An asynchronous indicator (spinner, pulse skeleton) is presented while a network request is pending.
- **EMPTY**: Legitimate zero-data condition (e.g. newly registered user with 0 transactions, 0 cards, or 0 beneficiaries).
- **ERROR**: Clear, actionable error alert communicating failure to the user with recovery actions.

**Core Diagnostic Question**: *Can an unexpected backend or network failure be mistaken by the user for a legitimate empty state, or does it leave the UI permanently frozen in a loading state without feedback?*

### 3. Recovery Evaluation
For every failure path, recovery mechanics were verified:
- Availability and operability of **Retry** buttons.
- Preservation of user-entered form inputs across failure cycles.
- Dismissal of modal dialogs without corrupted state.
- Ability to step backward in multi-step wizards to amend input parameters.
- Restitution of full functionality once the backend service recovers.

---

## Confirmed Defects

### WP-QA-ERR-001 — Dashboard Transactions Silent Swallow / False Empty State

- **Severity**: High
- **Route**: `/dashboard`
- **Endpoint**: `GET /api/v1/transactions?limit=3`
- **Failure injected**: HTTP 500 Internal Server Error / Network Abort
- **Expected behavior**: When the recent transactions query fails, the dashboard table area should render an explicit error banner (e.g., "Failed to load recent transactions") and an operable **Retry** button, alerting the user to temporary service degradation.
- **Actual behavior**: In `frontend/app/dashboard/page.tsx` (lines 51–56):
  ```typescript
  getTransactions({ limit: 3 })
    .then((res) => { ... })
    .catch((err) => {
      console.error('Failed to load recent transactions:', err);
      if (!isCancelled) {
        setIsLoadingTransactions(false);
      }
    });
  ```
  The catch block only executes `console.error` and toggles `isLoadingTransactions(false)`. `recentTransactions` remains an empty array `[]`. Consequently, lines 231–235 render:
  ```tsx
  <tr>
    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
      {isLoadingTransactions ? 'Loading transactions...' : 'No recent transactions'}
    </td>
  </tr>
  ```
  The user is presented with `"No recent transactions"`.
- **User impact**: A user with hundreds of transactions will believe their transaction history has vanished or that their transfers were deleted. There is no user-facing indication that an API error occurred, and no way to retry without refreshing the entire browser window.
- **Reproduction**:
  1. Intercept `GET http://localhost:3001/api/v1/transactions*` returning HTTP 500.
  2. Navigate to `/dashboard`.
  3. Observe table body displaying `"No recent transactions"`.
- **Automated coverage**: `tests/ui/errors/error-handling.spec.ts` → `ERR-DASH-001` (configured with `test.fail(true)`).
- **Recommended remediation**:
  Introduce a `transactionsError` state variable in `DashboardPage`. If the call fails, set `transactionsError(message)` and render an error row inside the table containing an alert icon, error description, and a `handleRetryTransactions()` button.

---

### WP-QA-ERR-002 — Send Money Infinite Wallet Loading Skeleton & Progression Block

- **Severity**: High
- **Route**: `/dashboard/send-money`
- **Endpoint**: `GET /api/v1/wallets/me`
- **Failure injected**: HTTP 500 Internal Server Error / Network Abort
- **Expected behavior**: If the wallet balance cannot be retrieved, Step 2 (Select Source Wallet) should render an error card stating that wallet balances are temporarily unavailable, accompanied by a Retry button.
- **Actual behavior**: In `frontend/app/dashboard/send-money/page.tsx` (lines 53–56):
  ```typescript
  getMyWallet()
    .then((data) => { setWallet(data); setIsLoadingWallet(false); })
    .catch((err) => {
      console.error('Failed to load wallet for transfer:', err);
      if (!isCancelled) setIsLoadingWallet(false);
    });
  ```
  When the request fails, `wallet` remains `null`, and `isLoadingWallet` is set to `false`. In Step 2 (lines 312–330):
  ```tsx
  {!isLoadingWallet && wallet ? (
    <div className="w-full p-4 border-2 border-blue-600 ...">...</div>
  ) : (
    <div className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
  )}
  ```
  Because `wallet` is null, the pulse skeleton (`animate-pulse`) renders indefinitely. In addition, the Next button (line 342) is locked:
  ```tsx
  <button onClick={handleNext} disabled={!wallet} className="...">Next</button>
  ```
  The user sees a perpetually pulsing box with a disabled Next button.
- **User impact**: The user is completely stranded on Step 2 of the transfer wizard. They assume the system is actively loading their balance, waiting indefinitely with no error feedback or recovery path.
- **Reproduction**:
  1. Intercept `GET http://localhost:3001/api/v1/wallets/me` returning HTTP 500.
  2. Navigate to `/dashboard/send-money`, select an existing beneficiary, and click "Next".
  3. Step 2 renders an infinite pulsing skeleton; the Next button remains permanently disabled.
- **Automated coverage**: `tests/ui/errors/error-handling.spec.ts` → `ERR-SEND-001` (configured with `test.fail(true)`).
- **Recommended remediation**:
  Introduce a `walletError` state in `SendMoneyPage`. On catch, set `walletError`. In Step 2, if `walletError` is present, display an error banner with a Retry button instead of the pulse skeleton.

---

### WP-QA-ERR-003 — Send Money Beneficiary Load Failure Masked as Empty State

- **Severity**: High
- **Route**: `/dashboard/send-money`
- **Endpoint**: `GET /api/v1/beneficiaries`
- **Failure injected**: HTTP 500 Internal Server Error / Network Abort
- **Expected behavior**: If the beneficiary retrieval endpoint fails, Step 1 should display an error message (e.g., "Unable to load saved beneficiaries. Please try again.") along with a Retry button.
- **Actual behavior**: In `frontend/app/dashboard/send-money/page.tsx` (lines 65–68):
  ```typescript
  getBeneficiaries()
    .then((data) => { ... })
    .catch((err) => {
      console.error('Failed to load beneficiaries for transfer:', err);
      if (!isCancelled) setIsLoadingBeneficiaries(false);
    });
  ```
  The catch block only logs to console. `beneficiaries` defaults to `[]`. In Step 1 (lines 286–292):
  ```tsx
  ) : !isLoadingBeneficiaries ? (
    <div className="p-6 text-center text-sm text-slate-600 ...">
      No beneficiaries saved yet.{' '}
      <Link href="/dashboard/beneficiaries" className="text-blue-600 hover:underline font-medium">
        Add a beneficiary first
      </Link>
    </div>
  )
  ```
  Because `!isLoadingBeneficiaries` is true and `beneficiaries.length === 0`, the UI displays the empty state message `"No beneficiaries saved yet. Add a beneficiary first."`.
- **User impact**: Users with saved beneficiaries are falsely informed that they have none. This prompts users to navigate away to create duplicate beneficiaries, causing workflow disruption.
- **Reproduction**:
  1. Intercept `GET http://localhost:3001/api/v1/beneficiaries` returning HTTP 500.
  2. Navigate to `/dashboard/send-money`.
  3. Step 1 immediately displays `"No beneficiaries saved yet. Add a beneficiary first."`.
- **Automated coverage**: `tests/ui/errors/error-handling.spec.ts` → `ERR-SEND-002` (configured with `test.fail(true)`).
- **Recommended remediation**:
  Add `beneficiariesError` state. On catch, set `beneficiariesError(message)`. In Step 1, render an explicit error banner with a Retry action if `beneficiariesError` is populated.

---

### WP-QA-ERR-004 — Send Money Polling Silent Failure in PENDING State

- **Severity**: Medium
- **Route**: `/dashboard/send-money` (Step 6 / Complete)
- **Endpoint**: `GET /api/v1/transactions/:id`
- **Failure injected**: HTTP 500 Internal Server Error / Network Abort on subsequent status polling calls
- **Expected behavior**: When a transfer has been accepted by the backend (`POST /transfers` succeeds with `status: PENDING`), subsequent status polling failures should be communicated to the user (e.g., "Status updates temporarily unavailable. Your transaction reference is [WP-XXX]. You can track completion in your Transactions history.").
- **Actual behavior**: In `frontend/app/dashboard/send-money/page.tsx` (lines 127–141):
  ```typescript
  const interval = setInterval(async () => {
    attempts += 1;
    try {
      const latest = await getTransaction(completedTransaction.id);
      setCompletedTransaction(latest);
      if (latest.status === 'COMPLETED' || latest.status === 'FAILED' || attempts >= 20) {
        clearInterval(interval);
        getMyWallet().then(setWallet).catch(console.error);
      }
    } catch (err) {
      console.error('Error polling transaction status:', err);
    }
  }, 1500);
  ```
  When `getTransaction(id)` encounters a 500 or network failure, the error is silently caught with `console.error`. The UI remains on the "Processing Transfer" screen with an animated spinner SVG and amber `PENDING` badge. After 20 attempts (30 seconds), the interval silently terminates without updating the UI or notifying the user.
- **User impact**: The user is left watching a spinning loading wheel indefinitely, unaware that network communication has failed. This induces uncertainty over whether money was debited or transferred.
- **Reproduction**:
  1. Initiate a transfer on `/dashboard/send-money`.
  2. Allow `POST /api/v1/transfers` to succeed (HTTP 201).
  3. Intercept all subsequent `GET /api/v1/transactions/:id` requests with HTTP 500.
  4. Observe the UI staying in "Processing Transfer" spinner indefinitely with no error or warning message.
- **Automated coverage**: `tests/ui/errors/error-handling.spec.ts` → `ERR-SEND-008` (configured with `test.fail(true)`).
- **Recommended remediation**:
  Track consecutive polling errors. If 3 consecutive polling attempts fail, display an informational alert explaining that live status streaming is temporarily disrupted and offer a "Check Status Now" button alongside the existing link to Transactions.

---

### WP-QA-ERR-005 — Cards Page Simultaneous Error Banner and Empty State

- **Severity**: Medium
- **Route**: `/dashboard/cards`
- **Endpoint**: `GET /api/v1/cards`
- **Failure injected**: HTTP 500 Internal Server Error
- **Expected behavior**: When card loading fails, the page should display the red error banner ("Failed to load cards") and suppress the card list container and empty state message entirely.
- **Actual behavior**: In `frontend/app/dashboard/cards/page.tsx` (lines 267–271):
  ```tsx
  ) : !isLoading ? (
    <div className="col-span-2 bg-white dark:bg-slate-900 rounded-lg p-8 text-center border ...">
      No payment cards saved yet. Click below to add a card.
    </div>
  )
  ```
  When `getCards()` fails with 500, `pageError` is set to `"Failed to load cards"`, and `isLoading` is set to `false`. The error banner correctly renders at the top of the page. However, because `!isLoading` is true and `cards.length === 0`, the cards container simultaneously renders `"No payment cards saved yet. Click below to add a card."`.
- **User impact**: The user receives contradictory signals: an error banner stating that cards could not be loaded, alongside an empty state stating that no payment cards exist on the account.
- **Reproduction**:
  1. Intercept `GET http://localhost:3001/api/v1/cards` returning HTTP 500.
  2. Navigate to `/dashboard/cards`.
  3. Observe both the red error banner at the top AND the empty state card rendered in the content area.
- **Automated coverage**: `tests/ui/errors/error-handling.spec.ts` → `ERR-CARDS-001` (configured with `test.fail(true)`).
- **Recommended remediation**:
  In `frontend/app/dashboard/cards/page.tsx`, update the empty state condition to `!isLoading && !pageError`.

---

## Acceptable Behavior

The following table documents endpoints and user journeys where backend failures are handled appropriately according to UI/UX and architectural standards:

| Test ID | Component / Route | Injected Failure | Observed UI Behavior | Evaluation |
|---|---|---|---|---|
| **ERR-AUTH-001** | `/login` | `POST /auth/login` → 401 | Displays inline red alert: *"Incorrect email or password"*; input fields remain editable. | **Acceptable**: Secure authentication error feedback without state corruption. |
| **ERR-AUTH-002** | `/login` | `POST /auth/login` → 500 | Displays server error message; loading spinner removed; sign in button restored. | **Acceptable**: Clear server error; user can retry. |
| **ERR-AUTH-003** | `/login` | `POST /auth/login` → Network Fail | Red error box shown; email and password inputs preserved. | **Acceptable**: Network fault surfaced immediately. |
| **ERR-AUTH-004** | `/signup` | `POST /auth/signup` → 400 | Validation/duplicate error displayed under email field; form inputs preserved. | **Acceptable**: Field-level validation feedback. |
| **ERR-AUTH-005** | `/verify-email` | `POST /auth/verify-email` → 400 | Red error message displayed under OTP field; input code preserved; verify button re-enabled. | **Acceptable**: Clear OTP feedback. |
| **ERR-AUTH-006** | App Router Guard | `GET /users/me` → 500 (init) | Token cannot be verified; user gracefully redirected to `/login`. | **Acceptable**: Clean fallback to unauthenticated state. |
| **ERR-AUTH-007** | App Router Guard | `GET /users/me` → Network Fail | Session initialization aborts; user safely redirected to `/login`. | **Acceptable**: Secure route protection on network partition. |
| **ERR-DASH-002** | `/dashboard` | `GET /wallets/me` → 500 | Wallet error banner displayed with operable **Retry** button. | **Acceptable**: Prominent error display with user recovery action. |
| **ERR-DASH-004** | `/dashboard` | `GET /wallets/me` → Network Fail | Wallet error banner displayed with operable **Retry** button. | **Acceptable**: Resilient to offline/network failures. |
| **ERR-BEN-001** | `/dashboard/beneficiaries` | `GET /beneficiaries` → 500 | Page-level red alert displayed with operable **Retry** button. | **Acceptable**: User can re-trigger data fetch upon recovery. |
| **ERR-BEN-002** | Beneficiary Modal | `POST /beneficiaries` → 400 | Form error displayed in modal; modal stays open; input data preserved. | **Acceptable**: Prevents accidental data loss on validation error. |
| **ERR-BEN-003** | Beneficiary Modal | `POST /beneficiaries` → 409 | Conflict error message displayed in modal; modal stays open. | **Acceptable**: Clear capacity limit / conflict indication. |
| **ERR-BEN-004** | `/dashboard/beneficiaries` | `DELETE /beneficiaries/:id` → 500 | Page error banner displayed; beneficiary record is NOT removed from UI. | **Acceptable**: Prevents false optimistic deletion on server error. |
| **ERR-BEN-005** | `/dashboard/beneficiaries` | `DELETE /beneficiaries/:id` → 404 | Error banner displayed; handles already-deleted entity gracefully. | **Acceptable**: Idempotent deletion failure handling. |
| **ERR-BEN-006** | `/dashboard/beneficiaries` | `GET /beneficiaries` → Network Fail | Error banner rendered at page level. | **Acceptable**: Surfaced to user cleanly. |
| **ERR-CARDS-002** | Add Card Modal | `POST /cards` → 400 | Error alert displayed inside modal; modal remains open; card details preserved. | **Acceptable**: User does not have to retype card details. |
| **ERR-CARDS-003** | `/dashboard/cards` | `POST /cards/:id/freeze` → 500 | Page error banner displayed; card status preserved as active. | **Acceptable**: UI state stays synchronized with backend truth. |
| **ERR-CARDS-004** | `/dashboard/cards` | `POST /cards/:id/freeze` → 409 | Error banner displayed for conflict (e.g. already frozen). | **Acceptable**: Accurate conflict messaging. |
| **ERR-CARDS-005** | `/dashboard/cards` | `DELETE /cards/:id` → 500 | Error banner displayed; card item retained in the management list. | **Acceptable**: No optimistic removal when backend deletion fails. |
| **ERR-CARDS-006** | `/dashboard/cards` | `DELETE /cards/:id` → 404 | Error banner displayed; handles non-existent card gracefully. | **Acceptable**: Clean error surfacing. |
| **ERR-SEND-003** | Send Money Review | `POST /transfers` → 400 | Red error alert displayed inline on Review step; wizard stays on review; data preserved. | **Acceptable**: User can inspect and correct transfer details. |
| **ERR-SEND-004** | Send Money Review | `POST /transfers` → 409 | Duplicate/conflict alert displayed; wizard stays on review. | **Acceptable**: Prevents duplicate transfer submission. |
| **ERR-SEND-005** | Send Money Review | `POST /transfers` → 500 | Error alert displayed; Confirm button re-enabled for immediate retry. | **Acceptable**: User is not forced to restart the multi-step wizard. |
| **ERR-SEND-006** | Send Money Review | `POST /transfers` → Network Fail | Error alert displayed; wizard remains on review step. | **Acceptable**: Safe state retention during network drops. |
| **ERR-SEND-007** | Send Money Review | `GET /quote` → 500 | Red quote error shown; Confirm Transfer button disabled. | **Acceptable**: Prevents submission of invalid/stale FX conversions. |
| **ERR-TXN-001** | `/dashboard/transactions` | `GET /transactions` → 500 | Red error alert displayed with operable **Retry** button. | **Acceptable**: User can re-trigger transaction retrieval. |
| **ERR-TXN-002** | `/dashboard/transactions` | Filter query → 500 | Error alert displayed; **Retry** button available. | **Acceptable**: Dynamic query failure handling. |
| **ERR-TXN-003** | `/dashboard/transactions` | `GET /transactions` → Network Fail | Error alert displayed with Retry. | **Acceptable**: Robust to network disconnects. |
| **ERR-PROF-001** | `/dashboard/profile` | `PATCH /users/me` → 400 | Inline red alert displayed; dirty form values preserved; Save button re-enabled. | **Acceptable**: Non-destructive form error handling. |
| **ERR-PROF-002** | `/dashboard/profile` | `PATCH /users/me` → 500 | Error alert displayed; no false positive "Profile updated" banner. | **Acceptable**: Integrity preserved under server failure. |
| **ERR-PROF-003** | `/dashboard/profile` | `PATCH /users/me` → Network Fail | Error alert displayed; form values preserved. | **Acceptable**: Clean offline feedback. |
| **ERR-PROF-004** | `/dashboard/profile` | Baseline Success | Success banner displayed; error banner hidden. | **Acceptable**: Baseline verification confirming error path integrity. |
| **ERR-RECOV-001** | Dashboard Recovery | Wallet API Recovers | Clicking **Retry** dismisses error and displays live wallet balance. | **Acceptable**: Full state recovery verified. |
| **ERR-RECOV-002** | Transactions Recovery | Transaction API Recovers | Clicking **Retry** dismisses error and restores transaction table. | **Acceptable**: Full state recovery verified. |
| **ERR-RECOV-003** | Beneficiaries Recovery | Beneficiary API Recovers | Clicking **Retry** dismisses error and restores beneficiary cards. | **Acceptable**: Full state recovery verified. |
| **ERR-RECOV-004** | Send Money Recovery | Transfer Failure | Clicking **Back** navigates backward through wizard and preserves amount input. | **Acceptable**: Multi-step rollback verified. |
| **ERR-RECOV-005** | Add Card Recovery | Modal Cancel | Clicking **Cancel** on error closes modal cleanly and clears error state. | **Acceptable**: Modal cleanup verified. |
| **ERR-STATE-001** | Dashboard Wallet State | `GET /wallets/me` → 500 | Error alert replaces loading indicator; no infinite skeleton on dashboard. | **Acceptable**: Clear state transition (LOADING → ERROR). |

---

## Informational Observations

### WP-QA-OBS-001 — Exchange Rate Banner Graceful Degradation
- **Route**: `/dashboard`
- **Component**: `ExchangeRateBanner.tsx`
- **Behavior**: When `GET /api/v1/exchange-rates` fails (HTTP 500 or network abort), the banner component executes:
  ```typescript
  if (rates.length === 0) return null;
  ```
  The ticker banner silently disappears from the layout, and the rest of the dashboard (wallet balance, currency equivalents, transactions, navigation) remains completely usable without any layout shift or broken placeholder graphics.
- **Classification**: **Acceptable Graceful Degradation**. This is supplementary market information; hiding it rather than showing a prominent red warning maintains visual elegance and does not impede user payment workflows.

### WP-QA-OBS-002 — Transactions Table "No Transactions Found" Co-located with Error Banner
- **Route**: `/dashboard/transactions`
- **Component**: `TransactionsPage.tsx`
- **Behavior**: When `GET /api/v1/transactions` fails with HTTP 500, the page displays a prominent red alert banner with a **Retry** button at the top. However, inside the table body, line 200 executes:
  ```tsx
  ) : !isLoading ? (
    <tr><td colSpan={7} className="text-center ...">No transactions found</td></tr>
  )
  ```
  Because `transactions` is empty and `isLoading` is false, the table renders `"No transactions found"`.
- **Classification**: **Informational / UX Polish Observation**. Because the top error banner and Retry button are clearly visible, users understand that an error occurred. However, hiding the table or replacing the table body with an error row would eliminate any slight visual ambiguity.

### WP-QA-OBS-003 — Beneficiaries Page "No Beneficiaries" Message Co-located with Error Banner
- **Route**: `/dashboard/beneficiaries`
- **Component**: `BeneficiariesPage.tsx`
- **Behavior**: When `GET /api/v1/beneficiaries` returns HTTP 500, a red error banner with a **Retry** button is rendered at the top of the page. Simultaneously, the main section displays `"No beneficiaries saved yet. Click below to add your first beneficiary."` alongside the `"Add a Beneficiary"` dashed card.
- **Classification**: **Informational / UX Polish Observation**. Similar to WP-QA-OBS-002, the error banner and Retry button provide clear failure feedback, but suppressing the empty-state card when `pageError` is present would provide cleaner visual consistency.

---

## Scenarios Tested

| Domain | Scenario Description | Failure Injected | UI State Rendered | Recovery Verified | Classification |
|---|---|---|---|---|---|
| **Auth** | Login invalid password | 401 | ERROR | Preserves input | Acceptable |
| **Auth** | Login server crash | 500 | ERROR | Re-enables submit | Acceptable |
| **Auth** | Login network dropped | Network abort | ERROR | Preserves input | Acceptable |
| **Auth** | Signup duplicate email | 400 | ERROR | Preserves form | Acceptable |
| **Auth** | Verify email invalid code | 400 | ERROR | Preserves code | Acceptable |
| **Auth** | Session restore server error | 500 | REDIRECT | Clean login redirect | Acceptable |
| **Auth** | Session restore network fail | Network abort | REDIRECT | Clean login redirect | Acceptable |
| **Dashboard** | Recent transactions load error | 500 | **EMPTY** | **None (Swallowed)** | **Defect (WP-QA-ERR-001)** |
| **Dashboard** | Primary wallet load error | 500 | ERROR | **Retry** button works | Acceptable |
| **Dashboard** | Exchange rates ticker error | 500 | HIDDEN (null) | Page operational | Observation (WP-QA-OBS-001) |
| **Dashboard** | Primary wallet network fail | Network abort | ERROR | **Retry** button works | Acceptable |
| **Beneficiaries** | Beneficiaries load error | 500 | ERROR | **Retry** button works | Acceptable / WP-QA-OBS-003 |
| **Beneficiaries** | Beneficiary create validation | 400 | ERROR | Modal open & preserved | Acceptable |
| **Beneficiaries** | Beneficiary create limit hit | 409 | ERROR | Modal open & preserved | Acceptable |
| **Beneficiaries** | Beneficiary delete server error | 500 | ERROR | Record preserved | Acceptable |
| **Beneficiaries** | Beneficiary delete not found | 404 | ERROR | Clean error banner | Acceptable |
| **Beneficiaries** | Beneficiaries network fail | Network abort | ERROR | Error banner shown | Acceptable |
| **Cards** | Cards list load error | 500 | **ERROR + EMPTY** | **Dual State Rendered** | **Defect (WP-QA-ERR-005)** |
| **Cards** | Card create validation failure | 400 | ERROR | Modal open & preserved | Acceptable |
| **Cards** | Card freeze server error | 500 | ERROR | Status preserved | Acceptable |
| **Cards** | Card freeze status conflict | 409 | ERROR | Error banner shown | Acceptable |
| **Cards** | Card delete server error | 500 | ERROR | Card preserved | Acceptable |
| **Cards** | Card delete not found | 404 | ERROR | Error banner shown | Acceptable |
| **Send Money** | Step 2 wallet load error | 500 | **LOADING** | **Stuck (Next disabled)**| **Defect (WP-QA-ERR-002)** |
| **Send Money** | Step 1 beneficiary load error | 500 | **EMPTY** | **None (Swallowed)** | **Defect (WP-QA-ERR-003)** |
| **Send Money** | Step 5 transfer validation fail | 400 | ERROR | Stays on Review | Acceptable |
| **Send Money** | Step 5 transfer duplicate/conf | 409 | ERROR | Stays on Review | Acceptable |
| **Send Money** | Step 5 transfer server crash | 500 | ERROR | Confirm re-enabled | Acceptable |
| **Send Money** | Step 5 transfer network abort | Network abort | ERROR | Stays on Review | Acceptable |
| **Send Money** | FX Quote service failure | 500 | ERROR | Confirm disabled | Acceptable |
| **Send Money** | Step 6 polling status fail | 500 / Network | **LOADING** | **Stuck in PENDING** | **Defect (WP-QA-ERR-004)** |
| **Transactions** | Transactions list load error | 500 | ERROR | **Retry** button works | Acceptable / WP-QA-OBS-002 |
| **Transactions** | Filter query server error | 500 | ERROR | **Retry** button works | Acceptable |
| **Transactions** | Transactions network abort | Network abort | ERROR | **Retry** button works | Acceptable |
| **Profile** | Profile update validation fail | 400 | ERROR | Inputs preserved | Acceptable |
| **Profile** | Profile update server error | 500 | ERROR | No false success | Acceptable |
| **Profile** | Profile update network fail | Network abort | ERROR | Inputs preserved | Acceptable |
| **Profile** | Profile update success check | 200 (real API) | SUCCESS | Success banner | Acceptable |
| **Recovery** | Dashboard wallet API restored | Live 200 | SUCCESS | Recovers balance | Acceptable |
| **Recovery** | Transactions API restored | Live 200 | SUCCESS | Recovers table | Acceptable |
| **Recovery** | Beneficiaries API restored | Live 200 | SUCCESS | Recovers list | Acceptable |
| **Recovery** | Send money wizard back nav | Stays on Review | STEP BACK | Preserves amount | Acceptable |
| **Recovery** | Add Card modal cancel | Modal open | DISMISS | Closes & resets | Acceptable |
| **State** | Dashboard wallet state clear | 500 | ERROR | Clears "Loading..." | Acceptable |

---

## Limitations

1. **Client-Side Interception Boundaries**:
   All network failures and status codes were injected via Playwright route interception (`page.route()`) in the browser context. This accurately exercises the browser runtime, network stack, React query/fetch state transitions, error boundaries, and component rendering, but does not simulate mid-stream TCP socket resets or half-open socket states.
2. **Production Code Immutability**:
   Under strict instructions for this QA audit, no production frontend or backend code was modified. Defect verifications are codified as automated regressions using Playwright's native `test.fail(true)` convention.
3. **Third-Party Dependencies**:
   Third-party payment gateways, bank settlement rails, and KYC verification APIs are mocked at the NestJS controller and service boundary. External rail timeouts are evaluated via backend response simulation.

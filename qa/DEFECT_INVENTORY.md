# Authoritative Defect Inventory — WrightPay V1

**Document Reference:** `qa/DEFECT_INVENTORY.md`  
**Date:** September 19, 2026  
**Auditor:** WrightPay SDET & Quality Engineering Team  
**Status:** COMPLETE / AUTHORITATIVE BASELINE  
**Classification Rules:**
- **CONFIRMED DEFECTS:** Reproducible software errors, contract discrepancies, unhandled runtime crashes, data integrity flaws, accessibility violations, or UI state confusion.
- **ARCHITECTURAL RISKS:** Theoretical vulnerabilities or design trade-offs statically verified in code but requiring catastrophic external faults to trigger.
- **OBSERVATIONS & V1 LIMITATIONS:** Intended product scope boundaries, client-only demo mocks, or business rule constraints.

---

## Executive Summary

| Category | Confirmed Defects | Architectural Risks | Observations & Scope Limitations |
|---|---|---|---|
| **Backend & Distributed Systems** | 5 (`WP-QA-001`, `WP-QA-003`, `WP-QA-004`, `WP-QA-005`, `WP-QA-007`) | 2 (`WP-QA-002`, `WP-QA-008`) | 3 (`WP-QA-OBS-001` - `003`) |
| **Frontend & API Client Integration** | 3 (`WP-QA-009`, `WP-QA-AUTH-001`, `WP-QA-AUTH-002`) | 0 | 0 |
| **API / Network Error Handling** | 7 (`WP-QA-ERR-001` - `007`) | 0 | 0 |
| **Accessibility (WCAG 2.1 AA)** | 4 (`WP-QA-A11Y-001` - `004`) | 0 | 0 |
| **Responsive & Mobile Viewports** | 6 (`WP-QA-RESP-001` - `006`) | 0 | 0 |
| **TOTALS** | **25 Confirmed Defects** | **2 Architectural Risks** | **3 Product Limitations** |

---

## 1. Backend Confirmed Defects

### WP-QA-001: Missing Automatic Refund on Asynchronous BullMQ Settlement Failure
- **ID:** `WP-QA-001`
- **Severity:** High
- **Area:** Distributed Queues / Financial Integrity
- **Status:** OPEN (Confirmed by automated test)
- **Preconditions:** Authenticated user with funded wallet submits a valid transfer that initially passes balance checks and commits in PostgreSQL.
- **Reproduction:**
  1. Submit `POST /api/v1/transfers` with beneficiary name containing `SIMULATE_FAILURE`.
  2. Wallet is immediately debited in PostgreSQL (e.g. 100.00 EUR + 25.00 EUR fee).
  3. BullMQ worker attempts payout 3 times, exhausts retries, and marks transaction as `FAILED`.
- **Expected Behavior:** When a transfer permanently fails, a compensating ledger transaction should be recorded, and the source wallet balance should be refunded.
- **Actual Behavior:** Transaction status transitions to `FAILED` with `failureReason`, but wallet balance remains permanently debited. No compensating refund record is created.
- **Evidence / Test Coverage:** `qa/automation/tests/concurrency/queue-reliability.spec.ts` (test: *'confirms WP-QA-001: wallet balance is NOT refunded'*).
- **Root Cause:** `TransfersProcessor` marks the transaction as `FAILED` upon exhausted retries but does not execute a compensating credit to `wallets` or insert a refund transaction.
- **Suggested Remediation:** Implement an automatic compensating database transaction in `TransfersProcessor.catch` block when `isLastAttempt` is true.
- **Regression Test:** `qa/automation/playwright.defects.config.ts` (Test 1).

---

### WP-QA-003: Malformed Non-UUID Path Parameter Triggers Unhandled HTTP 500
- **ID:** `WP-QA-003`
- **Severity:** Medium
- **Area:** API Boundary / Exception Filter
- **Status:** OPEN (Confirmed by automated test)
- **Preconditions:** Valid bearer token.
- **Reproduction:**
  1. Call `GET /api/v1/transactions/12345` or `GET /api/v1/transactions/not-a-uuid`.
  2. Call `POST /api/v1/cards/abc-xyz/freeze`.
  3. Call `DELETE /api/v1/beneficiaries/invalid-id`.
- **Expected Behavior:** HTTP 400 Bad Request (`Validation failed: UUID expected`) or HTTP 404 Not Found.
- **Actual Behavior:** HTTP 500 Internal Server Error with PostgreSQL driver exception `QueryFailedError: invalid input syntax for type uuid: "12345"`.
- **Evidence / Test Coverage:** `qa/automation/tests/security/error-handling-500.spec.ts`.
- **Root Cause:** Route controllers accept raw string `@Param('id')` without NestJS `ParseUUIDPipe`. TypeORM passes the malformed string directly to PostgreSQL, where Postgres throws code `22P02`.
- **Suggested Remediation:** Add `@Param('id', new ParseUUIDPipe())` across all controllers accepting entity UUIDs.
- **Regression Test:** `qa/automation/playwright.defects.config.ts` (Tests 2, 3, 4, 5, 6).

---

### WP-QA-004: Serialized Exchange Rate Type Discrepancy (String vs OpenAPI Number)
- **ID:** `WP-QA-004`
- **Severity:** Low
- **Area:** API Contract / OpenAPI Specification
- **Status:** OPEN (Confirmed by automated test)
- **Preconditions:** Any client accessing `GET /api/v1/exchange-rates`.
- **Reproduction:**
  1. `curl http://localhost:3001/api/v1/exchange-rates`
  2. Inspect the JSON payload: `[{"from":"EUR","to":"USD","rate":"1.080000",...}]`.
- **Expected Behavior:** Per OpenAPI spec (`docs/WrightPay-API.yaml` line 348), `rate` should be serialized as a JSON number (`1.08`).
- **Actual Behavior:** TypeORM `@Column({ type: 'decimal', precision: 12, scale: 6 })` returns PostgreSQL numeric columns as JavaScript strings (`"1.080000"`).
- **Evidence / Test Coverage:** `qa/automation/tests/exchange-rates/exchange-rates.spec.ts`.
- **Root Cause:** Node PostgreSQL driver `pg` defaults to returning decimals as strings to prevent IEEE 754 precision loss. No TypeORM transformer or DTO serializer converts it to number.
- **Suggested Remediation:** Add a numeric transformer in `ExchangeRate` entity or convert via DTO in `ExchangeRatesService.getAllRates()`.
- **Regression Test:** `qa/automation/tests/exchange-rates/exchange-rates.spec.ts`.

---

### WP-QA-005: Beneficiary Creation Accepts Whitespace-Only Name and Persists Empty String
- **ID:** `WP-QA-005`
- **Severity:** Low
- **Area:** Input Validation / Data Integrity
- **Status:** OPEN (Confirmed by automated test)
- **Preconditions:** Authenticated user with fewer than 3 active beneficiaries.
- **Reproduction:**
  1. Send `POST /api/v1/beneficiaries` with body `{ "name": "   ", "currency": "EUR", "payoutMethod": "bank_account", "accountNumber": "FR123456789" }`.
- **Expected Behavior:** HTTP 400 Bad Request rejecting blank/whitespace strings.
- **Actual Behavior:** HTTP 201 Created. The database record is persisted with `name: ""` (empty string).
- **Evidence / Test Coverage:** `qa/automation/tests/security/input-validation.spec.ts:246`.
- **Root Cause:** DTO uses `@IsNotEmpty()` from class-validator, but without custom trim sanitizer; whitespace-only strings evaluate as length > 0 in JavaScript. The service then executes `.trim()`, converting it to an empty string before saving.
- **Suggested Remediation:** Add `@Matches(/\\S/, { message: 'Name cannot be empty or whitespace only' })` or use class-transformer `@Transform(({ value }) => value?.trim())`.
- **Regression Test:** `qa/automation/playwright.defects.config.ts` (Tests 7, 8).

---

### WP-QA-007: Idempotency Lock Key Deletion on Early Failure Stalls Concurrent Callers
- **ID:** `WP-QA-007`
- **Severity:** Low
- **Area:** Concurrency / Distributed Locking
- **Status:** OPEN (Confirmed by automated test)
- **Preconditions:** Two concurrent requests arrive at the exact same millisecond with identical `Idempotency-Key`, but the primary request fails pre-commit validation (e.g. insufficient funds).
- **Reproduction:**
  1. Fire Request A and Request B concurrently with the same idempotency key and an amount exceeding wallet balance.
  2. Request A fails early and calls `idempotencyService.deleteKey(key)`.
- **Expected Behavior:** Request B should either fail fast or proceed immediately.
- **Actual Behavior:** Request B enters the polling loop in `idempotencyService.handle()`. Because the key was deleted rather than marked with an error status, Request B stalls for the entire 2.5-second timeout and then returns a misleading `HTTP 409 Conflict: "Transfer is currently being processed"`.
- **Evidence / Test Coverage:** `qa/automation/tests/concurrency/idempotency-race.spec.ts:392`.
- **Root Cause:** `deleteKey()` removes the lock from Redis, but the polling helper expects the key to transition to `COMPLETED` or `FAILED`. Key absence within polling triggers timeout.
- **Suggested Remediation:** Instead of `del(key)` on early failure, set a short-lived status `{ status: 'FAILED' }` or allow the second caller to acquire the lock immediately.
- **Regression Test:** `qa/automation/playwright.defects.config.ts` (Test 9).

---

## 2. Frontend & API Integration Confirmed Defects

### WP-QA-009: Frontend Card Type Casing Mismatch (HTTP 400 on Card Creation)
- **ID:** `WP-QA-009`
- **Severity:** Medium
- **Area:** Frontend API Client / Schema Compatibility
- **Status:** OPEN (Confirmed in code and API test)
- **Preconditions:** Authenticated user opens Card Creation modal in frontend (`/dashboard/cards`).
- **Reproduction:**
  1. Fill out cardholder name, PAN, expiry, CVV in the frontend modal.
  2. Submit form.
  3. Frontend `createCard()` in `frontend/lib/api/cards.ts` executes:
     `type: payload.type ? payload.type.toUpperCase() : 'DEBIT'`
  4. The request payload contains `type: "DEBIT"`.
- **Expected Behavior:** Card is created and returned with HTTP 201.
- **Actual Behavior:** Backend `CreateCardDto` validates with `@IsEnum(CardType)`. `CardType` enum values in `backend/src/modules/cards/entities/card.entity.ts` are lowercase (`debit`, `credit`). Backend rejects request with `HTTP 400 Bad Request: type must be one of the following values: debit, credit`.
- **Evidence / Test Coverage:** `frontend/lib/api/cards.ts:52` vs `backend/src/modules/cards/entities/card.entity.ts:20-23`.
- **Root Cause:** Client adapter forcefully calls `.toUpperCase()` on `type`, whereas backend enum requires lowercase `'debit'` or `'credit'`.
- **Suggested Remediation:** Change `frontend/lib/api/cards.ts:52` to use `payload.type ? payload.type.toLowerCase() : 'debit'`.
- **Regression Test:** `qa/automation/tests/cards/cards.spec.ts`.

---

### WP-QA-AUTH-001: Inconsistent Session Invalidation on Secondary API 401
- **ID:** `WP-QA-AUTH-001`
- **Severity:** High
- **Area:** Authentication Lifecycle / Client Session State
- **Status:** OPEN (Confirmed by automated Playwright test)
- **Preconditions:** User is logged in on `/dashboard`.
- **Reproduction:**
  1. Intercept any post-hydration API call (`/wallets/me`, `/transactions`, `PATCH /users/me`) with HTTP 401.
  2. Central API wrapper `frontend/lib/api.ts` intercepts 401 and executes `removeStoredToken()`.
- **Expected Behavior:** User is immediately redirected to `/login`, in-memory React auth state is cleared, and protected UI is unmounted.
- **Actual Behavior:** `localStorage` token is deleted, but `api.ts` has no event listener or callback to update React `AuthContext`. React in-memory state retains `isAuthenticated: true`. The user remains stuck on the dashboard seeing a localized error banner while their underlying token is gone.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/session/session-expiry.spec.ts`.
- **Root Cause:** Disconnect between non-React module `lib/api.ts` and React Context `auth-context.tsx`.
- **Suggested Remediation:** Dispatch a custom `window.dispatchEvent(new Event('auth:unauthorized'))` in `api.ts` and subscribe within `AuthProvider` to execute `logout()`.
- **Regression Test:** `qa/automation/tests/ui/session/session-expiry.spec.ts`.

---

### WP-QA-AUTH-002: Transaction Settlement Polling Survives 401
- **ID:** `WP-QA-AUTH-002`
- **Severity:** Medium
- **Area:** Frontend Polling / Session Handling
- **Status:** OPEN (Confirmed by automated Playwright test)
- **Preconditions:** User initiates a transfer on `/dashboard/send-money`.
- **Reproduction:**
  1. Transfer submitted; frontend initiates background interval polling `GET /transactions/:id` every 1000ms.
  2. Intercept polling endpoint with HTTP 401.
- **Expected Behavior:** Polling interval terminates immediately, user is warned, and session redirects to login.
- **Actual Behavior:** Polling catch block simply sets a localized error string and allows the `setInterval` timer to continue firing repeated 401 requests indefinitely.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/session/session-expiry.spec.ts`.
- **Root Cause:** `clearInterval()` is omitted in the polling error handler inside `send-money/page.tsx`.
- **Suggested Remediation:** Explicitly call `clearInterval(pollTimer.current)` upon receiving HTTP 401 in polling handler.
- **Regression Test:** `qa/automation/tests/ui/session/session-expiry.spec.ts`.

---

## 3. API & Network Error-Handling Confirmed Defects

### WP-QA-ERR-001: Dashboard Transactions 500 Error Masked as "No recent transactions"
- **ID:** `WP-QA-ERR-001`
- **Severity:** Medium
- **Area:** UI Error State / Empty State Confusion
- **Status:** OPEN (Confirmed by automated Playwright test)
- **Reproduction:** Intercept `GET /api/v1/transactions` with HTTP 500 on `/dashboard`.
- **Expected Behavior:** Visible error banner or alert stating "Failed to load recent transactions. Please retry."
- **Actual Behavior:** The widget displays an empty state: `"No recent transactions"`. Users are misled into believing their account has zero activity when the service is actually experiencing an outage.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/errors/error-handling.spec.ts`.

---

### WP-QA-ERR-002: Send Money Wallet Loading 500 Traps UI in Infinite Loading Skeleton
- **ID:** `WP-QA-ERR-002`
- **Severity:** High
- **Area:** UI Error State / Wizard Blocking
- **Status:** OPEN (Confirmed by automated Playwright test)
- **Reproduction:** Intercept `GET /api/v1/wallets/me` with HTTP 500 on `/dashboard/send-money`.
- **Expected Behavior:** Wizard halts with a clear error: "Unable to load wallet balance. Please try again later."
- **Actual Behavior:** Step 2 renders animated skeleton pulse boxes indefinitely; "Next" button remains permanently disabled; zero error message is presented to the user.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/errors/error-handling.spec.ts`.

---

### WP-QA-ERR-003: Send Money Beneficiary Loading 500 Masked as "No beneficiaries saved yet"
- **ID:** `WP-QA-ERR-003`
- **Severity:** Medium
- **Area:** UI Error State / Empty State Confusion
- **Status:** OPEN (Confirmed by automated Playwright test)
- **Reproduction:** Intercept `GET /api/v1/beneficiaries` with HTTP 500 on Step 1 of `/dashboard/send-money`.
- **Expected Behavior:** Explicit alert: "Unable to load beneficiaries. Click here to retry."
- **Actual Behavior:** Dropdown/list renders: `"No beneficiaries saved yet"`, prompting the user to create duplicate beneficiaries.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/errors/error-handling.spec.ts`.

---

### WP-QA-ERR-004: Transactions Ledger 500 Masked as "No transactions found"
- **ID:** `WP-QA-ERR-004`
- **Severity:** Medium
- **Area:** UI Error State / Ledger Confusion
- **Status:** OPEN (Confirmed by automated Playwright test)
- **Reproduction:** Intercept `GET /api/v1/transactions?*` with HTTP 500 on `/dashboard/transactions`.
- **Expected Behavior:** Ledger table displays error banner with a "Retry" button.
- **Actual Behavior:** Table body displays `"No transactions found"` with an empty folder icon.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/errors/error-handling.spec.ts`.

---

### WP-QA-ERR-005: Beneficiaries Management 500 Masked as Empty State
- **ID:** `WP-QA-ERR-005`
- **Severity:** Medium
- **Area:** UI Error State / Management Screen Confusion
- **Status:** OPEN (Confirmed by automated Playwright test)
- **Reproduction:** Intercept `GET /api/v1/beneficiaries` with HTTP 500 on `/dashboard/beneficiaries`.
- **Expected Behavior:** Error message displayed; table/grid informs user that data could not be retrieved.
- **Actual Behavior:** Card displays `"No beneficiaries saved yet"` with a CTA to add one.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/errors/error-handling.spec.ts`.

---

### WP-QA-ERR-006: Cards Page 500 Leaves "Add Card" Modal Active Without Warning
- **ID:** `WP-QA-ERR-006`
- **Severity:** Low
- **Area:** UI Error State / Cards Management
- **Status:** OPEN (Confirmed by automated Playwright test)
- **Reproduction:** Intercept `GET /api/v1/cards` with HTTP 500 on `/dashboard/cards`.
- **Expected Behavior:** Error state rendered; card creation disabled until service recovers.
- **Actual Behavior:** Generic toast or banner shown, but "Add Card" button remains fully active; users fill out PAN/CVV only to fail on submit.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/errors/error-handling.spec.ts`.

---

### WP-QA-ERR-007: Exchange Rates Ticker 500 Silently Collapses Without Placeholder
- **ID:** `WP-QA-ERR-007`
- **Severity:** Low
- **Area:** UI Error State / Dashboard Ticker
- **Status:** OPEN (Confirmed by automated Playwright test)
- **Reproduction:** Intercept `GET /api/v1/exchange-rates` with HTTP 500 on `/dashboard`.
- **Expected Behavior:** Ticker container renders subtle fallback: "Exchange rates temporarily unavailable."
- **Actual Behavior:** Component catches error, returns `null`, and causes layout shift as the ticker container silently disappears.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/errors/error-handling.spec.ts`.

---

## 4. Accessibility Confirmed Defects (WCAG 2.1 AA)

### WP-QA-A11Y-001: Missing Form Label Associations on Profile Form Controls
- **ID:** `WP-QA-A11Y-001`
- **Severity:** Critical
- **WCAG Success Criteria:** 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)
- **Status:** OPEN (Confirmed by Axe scan)
- **Problem:** On `/dashboard/profile`, First Name, Last Name, and Default Currency `<input>`/`<select>` elements lack `id` attributes matching `<label htmlFor="...">`.
- **User Impact:** Screen readers announce "edit text, blank" without reading the field label.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/accessibility/accessibility-scan.spec.ts`.

---

### WP-QA-A11Y-002: Low Color Contrast on Secondary Text and Badges
- **ID:** `WP-QA-A11Y-002`
- **Severity:** Serious
- **WCAG Success Criteria:** 1.4.3 Contrast (Minimum) (Level AA)
- **Status:** OPEN (Confirmed by Axe scan)
- **Problem:** Tailwind class `text-muted-foreground` evaluates to a contrast ratio of ~3.2:1 against dark surface backgrounds (requires ≥ 4.5:1).
- **User Impact:** Low-vision users struggle to read timestamps, fees, and secondary card captions.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/accessibility/accessibility-scan.spec.ts`.

---

### WP-QA-A11Y-003: Missing Modal Dialog Roles and Focus Trapping
- **ID:** `WP-QA-A11Y-003`
- **Severity:** Serious
- **WCAG Success Criteria:** 2.1.2 No Keyboard Trap (Level A), 2.4.3 Focus Order (Level A)
- **Status:** OPEN (Confirmed by automated test)
- **Problem:** Modals on `/dashboard/cards` and `/dashboard/beneficiaries` use generic `<div>` wrappers without `role="dialog"`, `aria-modal="true"`, or keyboard focus confinement.
- **User Impact:** Pressing Tab allows focus to escape behind the active modal into inert background content.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/accessibility/accessibility-scan.spec.ts`.

---

### WP-QA-A11Y-004: Icon-Only Action Buttons Lack Accessible Names
- **ID:** `WP-QA-A11Y-004`
- **Severity:** Serious
- **WCAG Success Criteria:** 4.1.2 Name, Role, Value (Level A)
- **Status:** OPEN (Confirmed by Axe scan)
- **Problem:** Delete buttons, freeze toggles, and modal close buttons contain only `<svg>` icons with no text or `aria-label`.
- **User Impact:** Screen readers announce "button" with no descriptive name.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/accessibility/accessibility-scan.spec.ts`.

---

## 5. Responsive & Mobile Viewport Confirmed Defects

### WP-QA-RESP-001: Sidebar Layout Does Not Collapse on Mobile Viewports
- **ID:** `WP-QA-RESP-001`
- **Severity:** Critical
- **Affected Viewports:** 375 × 812, 390 × 844
- **Status:** OPEN (Confirmed by Playwright responsive test)
- **Problem:** `Sidebar.tsx` renders a fixed-width `<aside className="w-64">` (256px) with no responsive breakpoint (`hidden md:block`), hamburger button, or slide-over drawer.
- **User Impact:** On a 375px mobile screen, the sidebar consumes **68% of the viewport width**, leaving ~119px for page content. The dashboard is functionally unusable on phones.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/responsive/responsive.spec.ts`.

---

### WP-QA-RESP-002: Send Money Wizard Form Stepper Clipped at 375px
- **ID:** `WP-QA-RESP-002`
- **Severity:** High
- **Affected Viewports:** 375 × 812
- **Status:** OPEN (Confirmed by Playwright responsive test)
- **Problem:** 5-step horizontal wizard stepper overflows viewport width, causing step indicators and labels to clip off-screen.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/responsive/responsive.spec.ts`.

---

### WP-QA-RESP-003: Transactions Ledger Table Causes Horizontal Viewport Bleed
- **ID:** `WP-QA-RESP-003`
- **Severity:** High
- **Affected Viewports:** 375 × 812, 390 × 844
- **Status:** OPEN (Confirmed by Playwright responsive test)
- **Problem:** Ledger table lacks a container with `overflow-x-auto`. The 6-column table forces 2D horizontal scrolling across the entire page body.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/responsive/responsive.spec.ts`.

---

### WP-QA-RESP-004: Card Management Add Modal Overflows Viewport at 375px
- **ID:** `WP-QA-RESP-004`
- **Severity:** High
- **Affected Viewports:** 375 × 812
- **Status:** OPEN (Confirmed by Playwright responsive test)
- **Problem:** Modal container has a minimum width `min-w-[450px]`, exceeding mobile screen width and clipping the close button.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/responsive/responsive.spec.ts`.

---

### WP-QA-RESP-005: Dashboard Balance Metric Cards Overlap at 375px
- **ID:** `WP-QA-RESP-005`
- **Severity:** Medium
- **Affected Viewports:** 375 × 812
- **Status:** OPEN (Confirmed by Playwright responsive test)
- **Problem:** Grid container uses `grid-cols-2` without single-column fallback on narrow screens; currency badges collide.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/responsive/responsive.spec.ts`.

---

### WP-QA-RESP-006: Beneficiary Modal Backdrop Fails to Prevent Touch Scrolling
- **ID:** `WP-QA-RESP-006`
- **Severity:** Low
- **Affected Viewports:** Mobile touch screens
- **Status:** OPEN (Confirmed by Playwright responsive test)
- **Problem:** When modal is opened, body scrolling is not locked (`overflow: hidden` not applied to `document.body`), causing background content to scroll underneath.
- **Evidence / Test Coverage:** `qa/automation/tests/ui/responsive/responsive.spec.ts`.

---

## 6. Architectural Risks (Separated from Confirmed Defects)

### WP-QA-002: Unhandled BullMQ Enqueue Error Risks Orphaned PENDING Transfer
- **ID:** `WP-QA-002`
- **Classification:** Statically Confirmed Architectural Risk
- **Area:** Distributed Transactions / Dual-Write Problem
- **Why It Is Not a Defect:** In normal operation, Redis is available and jobs enqueue in ~2ms. The code executes a `try/catch` around `transfersQueue.add()`. However, if Redis drops mid-flight, the database commit has already occurred. The transaction remains in `PENDING` status with no active worker.
- **Remediation:** Implement the Transactional Outbox pattern or BullMQ job compensation in the catch block.
- **Evidence:** `backend/src/modules/transfers/transfers.service.ts:193-211`.

---

### WP-QA-008: Low 32-Bit Entropy in Transfer Reference Generation Risks Collision
- **ID:** `WP-QA-008`
- **Classification:** Architectural Scaling Risk
- **Area:** Data Architecture / Reference Generator
- **Why It Is Not a Defect:** At current development volume, collisions do not occur. However, `crypto.randomBytes(4)` yields only 4,294,967,296 possibilities per day. Under high transaction volume, birthday paradox probability dictates collision risks on unique column `reference`.
- **Remediation:** Increase entropy to `crypto.randomBytes(8)` (64-bit) or use a combined sequence/Crockford base32 generator.
- **Evidence:** `backend/src/modules/transfers/transfers.service.ts:51-55`.

---

## 7. Observations & Known V1 Product Limitations

### WP-QA-OBS-001: Mocked Onboarding / KYC Flow is Client-Only
- **Observation:** `/onboarding` is a client-side demonstration UI that transitions through steps without submitting documents or biometric data to an actual KYC provider. In the backend, user accounts are created with `kycStatus: NOT_STARTED`.

### WP-QA-OBS-002: Fixed-Fee Structure (25.00 EUR) on Small Transactions
- **Observation:** `TRANSFER_FEE` is fixed at `25.00 EUR` regardless of transfer magnitude. For a 1.00 EUR transfer, total deduction is 26.00 EUR. This is an intended business logic specification for V1.

### WP-QA-OBS-003: Single Currency Base Ledger (EUR) with Real-Time FX Equivalents
- **Observation:** WrightPay stores account balances in a primary default currency (EUR) and computes real-time portfolio equivalents for GBP, USD, AED, PLN, and INR on the fly. It is an atomic balance + transaction ledger, not a multi-currency double-entry core banking system.

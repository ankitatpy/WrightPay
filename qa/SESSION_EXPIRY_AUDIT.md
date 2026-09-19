# WrightPay — Phase 3D: Frontend 401 / Session Expiry QA Audit Report

**Report Version:** 1.0.0  
**Date:** September 19, 2026  
**Auditor:** QA Engineering Agent (Antigravity IDE)  
**Target Environment:** Local Full-Stack (`frontend`: Next.js 16 / React 19 @ port 3000, `backend`: NestJS / TypeORM / Redis @ port 3001)  
**Test Automation Suite:** `qa/automation/tests/ui/session/session-expiry.spec.ts` (46 test scenarios)  
**Production Code Modifications:** 0 files modified (100% black-box test automation via Playwright route interception)

---

## 1. Executive Summary

Phase 3D evaluated the session lifecycle and resilience of the WrightPay cross-border payments frontend when authenticated endpoints respond with **HTTP 401 Unauthorized**.

### Key Audit Metrics:
- **Total 401 Scenarios Executed:** 46
- **Passed Scenarios:** 46 / 46 (100% compliance with test specifications)
- **Confirmed Defects:** 2 (`WP-QA-AUTH-001`, `WP-QA-AUTH-002`)
- **Acceptable Behaviors:** 41 scenarios
- **Informational Observations:** 3 (`WP-QA-OBS-001`, `WP-QA-OBS-002`, `WP-QA-OBS-003`)
- **Test Limitations Identified:** 1 (Playwright test fixtures with persistent `addInitScript`)
- **Production Files Modified:** 0

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Phase 3D Test Coverage Breakdown                      │
├────────────────────────┬───────┬────────┬───────────────────────────────────┤
│ Domain / Category      │ Tests │ Status │ Behavior Classification           │
├────────────────────────┼───────┼────────┼───────────────────────────────────┤
│ 1. Initial Hydration   │   5   │ PASS   │ Correct Behavior                  │
│ 2. Dashboard APIs      │   7   │ PASS   │ 1 Defect (AUTH-001), 2 Obs        │
│ 3. Profile Mutation    │   4   │ PASS   │ 1 Defect (AUTH-001), 3 Correct    │
│ 4. Beneficiaries Mut.  │   4   │ PASS   │ Correct Behavior (Local handling) │
│ 5. Cards Mutations     │   3   │ PASS   │ Correct Behavior (Local handling) │
│ 6. Send Money Transfer │   4   │ PASS   │ Correct Behavior (Preserves data) │
│ 7. Transaction Polling │   3   │ PASS   │ 1 Defect (AUTH-002), 2 Correct    │
│ 8. Concurrent 401s     │   3   │ PASS   │ Correct Behavior (Clean redirect) │
│ 9. Token Storage       │   2   │ PASS   │ Correct Behavior (Eviction ok)    │
│ 10. Protected Routes   │   8   │ PASS   │ Correct Behavior & 1 Obs (OBS-003)│
│ Legacy Resilience Spec │   4   │ PASS   │ Pre-existing Phase 2 suite        │
├────────────────────────┼───────┼────────┼───────────────────────────────────┤
│ Total Execution        │  46   │ PASS   │ 2 Confirmed Defects Handled       │
└────────────────────────┴───────┴────────┴───────────────────────────────────┘
```

---

## 2. Confirmed Defects

### WP-QA-AUTH-001: Inconsistent Session Invalidation on Secondary API 401

- **Severity:** High
- **Classification:** Architectural State Disconnect / Partial Session Eviction
- **Affected Endpoints:** Post-hydration calls to `/wallets/me`, `/transactions`, `/beneficiaries`, `/cards`, `PATCH /users/me`, `POST /transfers`
- **Component:** `frontend/lib/api.ts` vs `frontend/lib/auth-context.tsx`
- **Symptom:** When a secondary or user-initiated API request returns HTTP 401 Unauthorized, the central API wrapper (`lib/api.ts`) immediately evicts the authentication token from `localStorage` (`removeStoredToken()`). However, `api.ts` has no communication channel, event emitter, or callback to notify React's `AuthContext`. Consequently:
  1. In-memory React state (`user`, `token`, `isAuthenticated`) remains `true`.
  2. `DashboardLayout.tsx` route guard does not trigger `router.push('/login')`.
  3. The user remains stranded on protected pages (`/dashboard`, `/dashboard/wallets`, `/dashboard/cards`, etc.) viewing localized error messages (e.g. red banner with text "Unauthorized") while their underlying credential has already been destroyed.
  4. The application only redirects to `/login` if the user manually reloads the page or navigates via the address bar.
- **Expected Behavior:** In standard SPA session management, any authenticated API request returning 401 should trigger an application-wide logout event that clears `AuthContext` and redirects the user to `/login` (with a flash message such as *"Your session has expired. Please sign in again."*).
- **Automation Test:** `AUTH-DASH-003`, `AUTH-PROF-004` (marked with `test.fail(true, 'WP-QA-AUTH-001')`).

---

### WP-QA-AUTH-002: Infinite Polling and Stuck Processing Spinner on 401 Polling Failure

- **Severity:** High
- **Classification:** Unbounded Interval Resource Leak & Indefinite Loading State
- **Affected Endpoint:** `GET /api/v1/transactions/:id` (Status Polling on `/dashboard/send-money`)
- **Component:** `frontend/app/dashboard/send-money/page.tsx` (lines 127–141)
- **Root Cause:**
  ```typescript
  // send-money/page.tsx
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
  When `getTransaction` encounters a 401 (or 500), `api.get` throws `ApiError(401)`. Execution immediately jumps to `catch (err)`. Lines 131–137 containing `clearInterval(interval)` are **never executed**.
- **Symptom:**
  1. The interval continues to fire every 1,500ms indefinitely in the background.
  2. The UI remains stuck forever in the animated spinner with heading `"Processing Transfer"` and status `"PENDING"`.
  3. The user is neither redirected to `/login` nor provided an error banner or retry button.
  4. Subsequent polling requests continue firing without an `Authorization` header because `api.ts` evicted the token on the first 401 attempt.
- **Expected Behavior:** The polling worker should clear the interval immediately upon fatal errors (especially 401 Unauthorized), update the wizard status or redirect to `/login`, and provide the user with clear feedback.
- **Automation Test:** `AUTH-POLL-001` (marked with `test.fail(true, 'WP-QA-AUTH-002')`).

---

## 3. Acceptable Behaviors

The audit verified robust behavior across 41 distinct operational paths:

1. **Initial Hydration Authentication Guard (`GET /api/v1/users/me -> 401`):**
   - Correctly clears `localStorage` token.
   - Clears `AuthContext` state (`token = null`, `user = null`, `isAuthenticated = false`).
   - Immediately redirects user to `/login`.
   - Protects confidential dashboard DOM (greeting, balances, navigation are never rendered or leaked).
   - No redirect loops or navigation thrashing (clean single transition).

2. **Send Money Transfer Guard (`POST /api/v1/transfers -> 401`):**
   - Wizard remains on Step 5 (Review Transfer).
   - Never transitions to `complete` step or displays `"Transfer Completed"`.
   - Renders inline error banner with error message.
   - Re-enables `"Confirm Transfer"` button so user is not stuck in a disabled submitting state.
   - Wizard inputs remain preserved, allowing user to navigate Back through previous steps.

3. **Profile Update Guard (`PATCH /api/v1/users/me -> 401`):**
   - Displays prominent red error banner `"Unauthorized"`.
   - Avoids false positive success banner (`"Profile updated successfully"` remains hidden).
   - Form inputs (`firstName`, `lastName`, `defaultCurrency`) preserve the user's modifications.
   - Re-enables `"Save Changes"` button.

4. **Beneficiaries Mutation Guard (`POST /beneficiaries -> 401`, `DELETE /beneficiaries/:id -> 401`):**
   - Modal remains open with form input preserved and displays modal error banner.
   - Delete action preserves beneficiary item in the UI list and displays page error banner.

5. **Cards Mutation Guard (`POST /cards -> 401`, `freeze -> 401`, `delete -> 401`):**
   - Add Card modal remains open with input preserved and displays modal error banner.
   - Freeze action preserves card active status and displays page error banner.
   - Delete action preserves card in list and displays page error banner.

6. **Multiple Concurrent 401 Requests:**
   - Simultaneous 401s across `/users/me`, `/wallets/me`, `/transactions`, and `/exchange-rates` resolve idempotently.
   - Single redirect to `/login` without race conditions or URL flickering.

7. **Protected-Route Enforcers:**
   - Direct navigation to `/dashboard`, `/dashboard/wallets`, `/dashboard/send-money`, `/dashboard/transactions`, `/dashboard/profile`, `/dashboard/cards`, and `/dashboard/beneficiaries` without a stored token immediately redirects to `/login`.

---

## 4. Informational Observations

### WP-QA-OBS-001: Silent Fallback on Dashboard Transactions 401
- **Component:** `frontend/app/dashboard/page.tsx` (`fetchTransactions` via `getTransactions({ limit: 3 })`)
- **Behavior:** When `/transactions` returns 401 during dashboard render, the `.catch()` block catches the error and assigns an empty array `setTransactions([])`. The UI silently displays *"No recent transactions"*, hiding the authentication failure from the user while the token is simultaneously evicted in the background.

### WP-QA-OBS-002: Public FX Endpoint 401 Triggers Token Eviction
- **Component:** `frontend/lib/api/exchange-rates.ts` & `frontend/lib/api.ts`
- **Behavior:** `getExchangeRates()` is documented as a public API endpoint. However, it uses the central `api.get()` wrapper. In `lib/api.ts`, line 125 checks `if (response.status === 401) { removeStoredToken(); }` unconditionally for **all** requests. If an API gateway, reverse proxy, or rate-limiter returns 401 on `/exchange-rates`, the client evicts the authenticated user's access token from `localStorage` even though the user was requesting public FX data.

### WP-QA-OBS-003: Graceful Session Recovery via Browser Reload
- **Component:** `frontend/lib/auth-context.tsx` (`AuthProvider.initAuth`)
- **Behavior:** Although secondary 401s leave the user on the dashboard with a disconnected `AuthContext` (`WP-QA-AUTH-001`), the fact that `api.ts` aggressively evicts the token from `localStorage` provides a reliable self-healing mechanism: as soon as the user refreshes the page or navigates, `initAuth()` checks `localStorage`, finds `null`, and triggers an immediate redirect to `/login`.

---

## 5. Test Limitations

- **Playwright `addInitScript` Re-injection:**  
  When using Playwright's `authenticatedUser` fixture, `page.addInitScript` injects the test token on every new document load/reload. To test unauthenticated route guards and browser reload recovery cleanly without artificial token re-injection, dedicated tests (`AUTH-ROUTE-001` through `008`) correctly decouple from `addInitScript` and interact with `localStorage` directly.

---

## 6. Comprehensive Scenarios Tested Matrix

| ID | Suite | Scenario Description | Expected Outcome | Actual UI Behavior | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `AUTH-HYDRATE-001` | Initial Hydration | `GET /users/me` 401 on initial mount | Token removed from localStorage | Token is null | Correct Behavior |
| `AUTH-HYDRATE-002` | Initial Hydration | `GET /users/me` 401 session state | AuthContext state reset | Renders login page | Correct Behavior |
| `AUTH-HYDRATE-003` | Initial Hydration | `GET /users/me` 401 URL redirect | Redirects to `/login` | URL is `/login` | Correct Behavior |
| `AUTH-HYDRATE-004` | Initial Hydration | `GET /users/me` 401 DOM protection | No protected content leaked | Dashboard elements not in DOM | Correct Behavior |
| `AUTH-HYDRATE-005` | Initial Hydration | `GET /users/me` 401 redirect loop check | No infinite redirects | Navigations <= 4 | Correct Behavior |
| `AUTH-DASH-001` | Dashboard APIs | `/users/me` 401 post-hydration | Immediate redirect to `/login` | Redirected to `/login` | Correct Behavior |
| `AUTH-DASH-002` | Dashboard APIs | `/wallets/me` 401 token eviction | Token evicted from localStorage | Token is null | Correct Behavior |
| `AUTH-DASH-003` | Dashboard APIs | `/wallets/me` 401 redirect check | Immediate redirect to `/login` | Stays on page with error | **Defect (WP-QA-AUTH-001)** |
| `AUTH-DASH-004` | Dashboard APIs | `/transactions` 401 handling | Token evicted, fallback displayed| Shows "No recent transactions"| Observation (WP-QA-OBS-001) |
| `AUTH-DASH-005` | Dashboard APIs | `/beneficiaries` 401 on page | Page error, token evicted | Banner rendered, token null | Correct Behavior |
| `AUTH-DASH-006` | Dashboard APIs | `/cards` 401 on cards page | Page error, token evicted | Banner rendered, token null | Correct Behavior |
| `AUTH-DASH-007` | Dashboard APIs | `/exchange-rates` 401 public call | Token eviction evaluated | Token is null | Observation (WP-QA-OBS-002) |
| `AUTH-PROF-001` | Profile | `PATCH /users/me` 401 error display | Error banner, no success banner | Error visible, success hidden | Correct Behavior |
| `AUTH-PROF-002` | Profile | `PATCH /users/me` 401 token eviction | Token evicted from storage | Token is null | Correct Behavior |
| `AUTH-PROF-003` | Profile | `PATCH /users/me` 401 form data | Inputs retained | Form inputs unchanged | Correct Behavior |
| `AUTH-PROF-004` | Profile | `PATCH /users/me` 401 redirect check | Redirect to `/login` | Stays on profile with error | **Defect (WP-QA-AUTH-001)** |
| `AUTH-BEN-001` | Beneficiaries | `POST /beneficiaries` 401 modal | Modal stays open with error | Modal visible, error banner on | Correct Behavior |
| `AUTH-BEN-002` | Beneficiaries | `POST /beneficiaries` 401 storage | Token evicted, no item added | Token is null, list unchanged | Correct Behavior |
| `AUTH-BEN-003` | Beneficiaries | `DELETE /beneficiaries/:id` 401 | Page error, item preserved | Error banner on, item visible | Correct Behavior |
| `AUTH-CARDS-001` | Cards | `POST /cards` 401 modal error | Modal stays open with error | Modal visible, error banner on | Correct Behavior |
| `AUTH-CARDS-002` | Cards | `Freeze card` 401 handling | Error banner, status unchanged | Error visible, status intact | Correct Behavior |
| `AUTH-CARDS-003` | Cards | `Delete card` 401 handling | Error banner, card preserved | Error visible, card in list | Correct Behavior |
| `AUTH-SEND-001` | Send Money | `POST /transfers` 401 completion | No complete step shown | Wizard remains on Review | Correct Behavior |
| `AUTH-SEND-002` | Send Money | `POST /transfers` 401 button state | Confirm re-enabled, error shown | Confirm enabled, error visible | Correct Behavior |
| `AUTH-SEND-003` | Send Money | `POST /transfers` 401 storage | Token evicted from storage | Token is null | Correct Behavior |
| `AUTH-SEND-004` | Send Money | `POST /transfers` 401 navigation | Allows Back navigation | Returns to Step 4 cleanly | Correct Behavior |
| `AUTH-POLL-001` | Transaction Poll | Polling `GET /transactions/:id` 401 | Interval cleared, redirects | Infinite polling, stuck spinner| **Defect (WP-QA-AUTH-002)** |
| `AUTH-POLL-002` | Transaction Poll | Polling 401 misleading check | Never claims Transfer Completed | Processing spinner stays visible| Correct Behavior |
| `AUTH-POLL-003` | Transaction Poll | Polling 401 storage eviction | Token evicted on first call | Token is null | Correct Behavior |
| `AUTH-CONC-001` | Concurrent 401s | All initial requests 401 | Clean redirect to `/login` | Lands on `/login` | Correct Behavior |
| `AUTH-CONC-002` | Concurrent 401s | Redirect storm check | Navigations bounded | Single redirect, no loop | Correct Behavior |
| `AUTH-CONC-003` | Concurrent 401s | Logged-out stability | Login form interactive | Form ready, inputs active | Correct Behavior |
| `AUTH-TOKEN-001` | Token Storage | `removeStoredToken` lifecycle | Removes `wrightpay_access_token`| Key evicted from localStorage | Correct Behavior |
| `AUTH-TOKEN-002` | Token Storage | Subsequent request headers | Omits Authorization header | Bearer header omitted | Correct Behavior |
| `AUTH-ROUTE-001` | Protected Routes| Unauthenticated `/dashboard` | Redirects to `/login` | Redirected | Correct Behavior |
| `AUTH-ROUTE-002` | Protected Routes| Unauthenticated `/wallets` | Redirects to `/login` | Redirected | Correct Behavior |
| `AUTH-ROUTE-003` | Protected Routes| Unauthenticated `/send-money` | Redirects to `/login` | Redirected | Correct Behavior |
| `AUTH-ROUTE-004` | Protected Routes| Unauthenticated `/transactions`| Redirects to `/login` | Redirected | Correct Behavior |
| `AUTH-ROUTE-005` | Protected Routes| Unauthenticated `/profile` | Redirects to `/login` | Redirected | Correct Behavior |
| `AUTH-ROUTE-006` | Protected Routes| Unauthenticated `/cards` | Redirects to `/login` | Redirected | Correct Behavior |
| `AUTH-ROUTE-007` | Protected Routes| Unauthenticated `/beneficiaries`| Redirects to `/login` | Redirected | Correct Behavior |
| `AUTH-ROUTE-008` | Protected Routes| Page reload after secondary 401 | Recovers to `/login` | Redirected upon reload | Observation (WP-QA-OBS-003) |
| Pre-existing 1–4 | Phase 2 Session | Session survival & 401 guard | 4 pre-existing resilience tests | All 4 pass cleanly | Correct Behavior |

---

## 7. Recommended Production Remediations

1. **Implement Global Auth Event Dispatcher for Secondary 401s:**
   In `frontend/lib/api.ts`, when `response.status === 401` is encountered, dispatch a custom browser event:
   ```typescript
   if (response.status === 401) {
     removeStoredToken();
     if (typeof window !== 'undefined') {
       window.dispatchEvent(new CustomEvent('wrightpay:unauthorized'));
     }
   }
   ```
   In `frontend/lib/auth-context.tsx`, listen for `'wrightpay:unauthorized'` to clear state and push `/login`:
   ```typescript
   useEffect(() => {
     const handleUnauthorized = () => {
       setToken(null);
       setUser(null);
       router.push('/login?reason=session_expired');
     };
     window.addEventListener('wrightpay:unauthorized', handleUnauthorized);
     return () => window.removeEventListener('wrightpay:unauthorized', handleUnauthorized);
   }, [router]);
   ```

2. **Add Polling Error Boundary and Interval Cleanup:**
   In `frontend/app/dashboard/send-money/page.tsx`, ensure `clearInterval` is called inside `catch`:
   ```typescript
   try {
     const latest = await getTransaction(completedTransaction.id);
     // ...
   } catch (err) {
     clearInterval(interval);
     setErrorMessage('Unable to verify transaction status. Please check your transaction history.');
   }
   ```

3. **Exempt Public Endpoints from Token Eviction:**
   In `frontend/lib/api.ts`, allow requests to specify `skipAuthHandling?: boolean` for public endpoints such as `/exchange-rates` so that unexpected 401s on public resources do not evict the user's valid session.

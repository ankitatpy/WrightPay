# WrightPay V1 — Master Quality Assurance Final Report

**Document Reference:** `qa/QA_FINAL_REPORT.md`  
**Date:** September 19, 2026  
**Auditor:** WrightPay Lead SDET & Quality Engineering Team  
**Status:** COMPLETE & AUTHORITATIVE  
**Repository Version:** V1.0.0-rc1  

---

> [!IMPORTANT]
> **SDET Portfolio & Realistic Scope Disclaimer:**  
> WrightPay is an AI-assisted cross-border payment platform prototype that was subsequently subjected to an exhaustive, systematic, and independent SDET testing process.  
> - WrightPay **does NOT** connect to real banking rails, real card issuing networks (Visa/Mastercard), or live UPI payment switches.
> - KYC and onboarding flows are client-side demonstrations; 2FA is not implemented.
> - The wallet ledger is an **atomic wallet balance debit with an append-only transaction ledger**; it is **NOT** a multi-currency double-entry core banking system.
> - This report documents the rigorous quality verification performed on the system as implemented, highlighting confirmed defects, architectural boundaries, and performance benchmarks without modifying production code.

---

## 1. Project Overview

WrightPay is a cross-border payments web application designed to allow European and international retail users to manage multi-currency balances, tokenize payment cards, save bank/UPI payout beneficiaries, and execute international fund transfers with real-time FX rate conversions.

### System Architecture
- **Frontend:** Next.js 16 (React 19, Tailwind CSS 4, App Router) running on port `3000`.
- **Backend:** NestJS 11 (Express, TypeORM, Swagger) running on port `3001` with global prefix `/api/v1`.
- **Primary Database:** PostgreSQL 16 managing `users`, `wallets`, `transactions`, `cards`, `beneficiaries`, `exchange_rates`, and `email_verifications`.
- **Cache & Distributed State:** Redis 7 managing distributed idempotency locks, request replay cache, and BullMQ worker queues.
- **Asynchronous Processing:** BullMQ running `transfersQueue` with background worker `TransfersProcessor` simulating external banking settlement.

---

## 2. V1 Scope

The verified V1 feature set includes:
1. **Authentication:** User registration with Argon2 password hashing, mock OTP email verification (`123456`), login with JWT issuance, and logout acknowledgement.
2. **User Profiles:** Authenticated user retrieval (`GET /users/me`) and safe field updates (`PATCH /users/me`).
3. **Multi-Currency Wallets:** Primary wallet storage (default currency EUR) and real-time equivalent balance conversions across 6 supported currencies: EUR, GBP, USD, AED, PLN, INR.
4. **Exchange Rates:** Public rate tables (`GET /exchange-rates`) and triangular currency quote calculations (`GET /exchange-rates/quote`).
5. **Beneficiary Management:** Creation, listing, and soft-deletion of payout recipients with strict business constraints (max 3 active beneficiaries, UPI rail locked to INR currency).
6. **Card Tokenization:** Simulated card creation (storing last 4 digits only), freezing, unfreezing, and deactivation.
7. **Transfer Orchestration:** Multi-step transfers with source wallet debiting, 25.00 EUR fixed fee calculation, BullMQ job dispatch, and background settlement polling.
8. **Idempotency Guardrails:** Redis-backed `Idempotency-Key` deduplication preventing duplicate debits.

---

## 3. V1 Product Limitations

The following architectural and business boundaries are documented product constraints:
1. **Single-Currency Base Storage:** Accounts store balances in a single primary currency; balances in other currencies are calculated equivalents based on current rates, not separate sub-accounts.
2. **Fixed Transfer Fee:** A flat fee of `25.00 EUR` is applied to every transfer, regardless of transfer magnitude.
3. **Client-Only KYC Demonstration:** The `/onboarding` route is an interactive frontend walkthrough that does not persist identity documents to backend services.
4. **No Real Banking Rails:** Asynchronous settlement is simulated via an internal worker timer (50ms delay).

---

## 4. QA Objectives

1. Audit and expand automated test coverage across all layers of the test pyramid.
2. Verify financial ledger consistency, balance sufficiency enforcement, and double-spend prevention under concurrency.
3. Quantify API response latency (p50, p95, p99) and throughput baselines using realistic load testing.
4. Verify accessibility (WCAG 2.1 AA), responsive design across mobile/tablet viewports, and full-stack error resilience.
5. Identify, classify, and track confirmed software defects without altering production source code.

---

## 5. Overall Test Strategy

The testing strategy follows a strict black-box and grey-box methodology:
- **Zero Production Modification:** All testing was conducted against the unmodified application code.
- **Cross-Layer Validation:** Assertions verify UI state, HTTP response contracts, Redis key lifecycles, BullMQ queue events, and PostgreSQL database records simultaneously.
- **Strict Classification Taxonomy:** Confirmed defects, architectural risks, and product limitations are strictly separated.

---

## 6. Test Pyramid & Automation Inventory

WrightPay's automated quality verification encompasses **608 functional tests**, 9 defect regression tests, and 6 k6 load/reliability scenarios:

```
                            ▲
                           / \
                          / 6 \       k6 Load & Reliability Scenarios
                         /=====\
                        /  49   \     Frontend Functional E2E (Playwright)
                       /---------\
                      /    152    \   A11y (26), Responsive (36), Errors (44), 401s (46)
                     /-------------\
                    /      277      \ Backend API & Distributed Integration (Playwright)
                   /-----------------\
                  /        130        \ Backend Unit & Isolated Logic (Jest)
                 /---------------------\
```

---

## 7. Backend & API Testing

- **Suite:** `qa/automation/tests/api/` (277 tests, 100% pass)
- **Scope:** Complete HTTP contract validation across all 8 REST controllers.
- **Verifications:** Bearer token authentication, input validation pipes, status codes (200, 201, 400, 401, 404, 409), and pagination offsets.

---

## 8. PostgreSQL & Database Testing

- **Entities Validated:** `User`, `Wallet`, `Transaction`, `Beneficiary`, `Card`, `ExchangeRate`, `EmailVerification`.
- **Integrity Verified:** Foreign key cascades, unique indexes, enum constraints, and TypeORM transactional commits.
- **Pessimistic Locking:** Confirmed that `SELECT ... FOR UPDATE` serializes concurrent debit operations against the same wallet record, eliminating double-spend race conditions.

---

## 9. Redis & Idempotency Testing

- **Mechanism:** `IdempotencyService` utilizes Redis `SET NX EX` with a 24-hour TTL and SHA-256 payload hashing.
- **Verifications:**
  - Identical replays return cached HTTP 201 responses without re-debiting wallets.
  - Reusing an `Idempotency-Key` with a different payload is strictly rejected with `HTTP 409 Conflict`.
  - Independent keys are processed as distinct transactions.

---

## 10. BullMQ & Distributed Queue Testing

- **Worker:** `TransfersProcessor` listening on `transfersQueue`.
- **Verifications:**
  - Transfer jobs enqueue with job ID `transfer-<transactionId>` and 3 retry attempts with exponential backoff.
  - Jobs transition from `PENDING` -> `PROCESSING` -> `COMPLETED`.
  - Burst transfers drain smoothly without queue backlog stalls.

---

## 11. Cross-Domain Integration Testing

- End-to-end integration workflows verified that user registration creates a default EUR wallet, funded wallets permit beneficiary payouts, payout transactions deduct balances, and card operations reflect in user profiles.

---

## 12. Security Testing

- **Authentication:** Argon2 password hashing verification, JWT token expiration, and forged signature rejection.
- **Authorization & IDOR Protection:** Proved that users cannot access or transfer funds using wallets, beneficiaries, or cards belonging to other tenant accounts (returns HTTP 404 / IDOR protection).
- **Injection & Tampering:** SQL-injection payloads and non-whitelisted parameters are stripped or safely parameterized by TypeORM.

---

## 13. Concurrency & Financial Invariants

- **Idempotency Race Test:** 10 virtual users submitted identical transfer requests at the exact same millisecond. Exactly 1 debit occurred (27.00 EUR total); 0 double-spending.
- **Balance Boundary Test:** Proved that transfers requesting balance + fee exceeding available balance by even 0.01 EUR are rejected with `HTTP 400 Insufficient Balance`.

---

## 14. Frontend UI Functional Testing

- **Suite:** `qa/automation/tests/ui/` (49 tests, 100% pass)
- **Coverage:** Login forms, registration validation, OTP email verification, dashboard metric rendering, beneficiary modals, card management toggles, and the multi-step transfer wizard.

---

## 15. Accessibility Testing (WCAG 2.1 AA)

- **Tooling:** `@axe-core/playwright` scanning all 12 application routes (26 tests).
- **Confirmed Defects Discovered:**
  - `WP-QA-A11Y-001` (Critical): Missing form label associations on `/dashboard/profile`.
  - `WP-QA-A11Y-002` (Serious): Low color contrast on muted secondary text (~3.2:1 vs required 4.5:1).
  - `WP-QA-A11Y-003` (Serious): Missing `role="dialog"` and keyboard focus trapping in modals.
  - `WP-QA-A11Y-004` (Serious): Icon-only action buttons lack accessible names.

---

## 16. Responsive Testing

- **Viewports Tested:** 375×812 (Mobile S), 390×844 (Mobile M), 768×1024 (Tablet), 1280×800 (Desktop) (36 tests).
- **Confirmed Defects Discovered:**
  - `WP-QA-RESP-001` (Critical): Sidebar has fixed width `w-64` (256px) without collapse or hamburger menu, consuming 68% of screen width on phones.
  - `WP-QA-RESP-002` (High): Send Money wizard stepper clipped at 375px.
  - `WP-QA-RESP-003` (High): Transactions ledger table causes 2D horizontal page bleed.
  - `WP-QA-RESP-004` (High): Add Card modal width (`min-w-[450px]`) overflows mobile screens.

---

## 17. API & Network Error Handling

- **Methodology:** Black-box route interception testing HTTP 400, 401, 404, 409, 500, and network dropouts (44 tests).
- **Confirmed Defects Discovered:**
  - `WP-QA-ERR-001` (Medium): Dashboard transactions 500 error masked as "No recent transactions".
  - `WP-QA-ERR-002` (High): Send Money wallet loading 500 traps UI in infinite loading skeleton.
  - `WP-QA-ERR-003` (Medium): Beneficiary loading 500 masked as "No beneficiaries saved yet".
  - `WP-QA-ERR-004` (Medium): Transactions ledger 500 masked as "No transactions found".

---

## 18. Session Expiry & 401 Lifecycle Testing

- **Suite:** `qa/automation/tests/ui/session/session-expiry.spec.ts` (46 tests).
- **Confirmed Defects Discovered:**
  - `WP-QA-AUTH-001` (High): `lib/api.ts` deletes `localStorage` token on 401 but fails to notify React `AuthContext`, leaving the user stranded on dashboard pages.
  - `WP-QA-AUTH-002` (Medium): Transfer settlement polling continues firing repeated 401 requests in an infinite loop without clearing timer.

---

## 19. Jest Unit Testing

- **Suite:** `backend/src/**/*.spec.ts` (18 test suites, 130 tests, 100% pass, 1.73s).
- **Pure Logic Covered:** Argon2 crypto hashing, JWT token parsing, wallet multi-currency equivalents, exchange rate triangular conversions, and transfer fee calculations.
- **Intentionally Left to Integration:** Database row locks (`FOR UPDATE`), multi-table transaction rollbacks, BullMQ Redis scripts, and Postgres foreign keys.

---

## 20. Performance & Load Testing with k6

- **Tooling:** `k6 v2.2.0` executing 6 deterministic scenarios (`qa/performance/`).
- **Baseline Measurements:**
  - Uncontended read latencies: `/wallets/me` p95 = **2.26 ms**, `/transactions` p95 = **1.24 ms**, `/exchange-rates` p95 = **0.43 ms**.
  - Login latency: p50 = **27.94 ms** (dominated by Argon2 CPU cost).
- **Read Load (10 VUs for 15s):**
  - **124,441 requests completed** at **8,272.3 req/s** with **0% errors** and **1.19 ms** average latency.
- **Controlled Transfer Load (5 VUs):**
  - 25 valid transfers completed with exact 650.00 EUR balance deduction. Median transfer latency: **4.60 ms**.

---

## 21. Reliability & Fault Injection Testing

- **BullMQ Retries:** Simulated banking failure (`SIMULATE_FAILURE`) triggered 3 worker retries with backoff, transitioning transaction to `FAILED` with failure reason captured.
- **Queue Backlog Draining:** Rapid burst of 10 enqueued transfers drained smoothly to `COMPLETED` without dropped jobs.
- **Idempotency Replay:** 5 sequential submissions with the same key deducted funds exactly once (30.00 AED) and returned cached responses 5/5 times.

---

## 22. Regression Strategy

- **Automated Regression Harness:**
  - `npm run typecheck` in both backend and QA automation.
  - `npm test -- --runInBand` running 130 isolated Jest unit tests.
  - `npm run test:baseline` running 277 API integration tests.
  - `npm run test:defects` running 9 defect confirmation tests.
- **Execution Speed:** Complete regression cycle executes in **under 35 seconds**.

---

## 23. Defect Management Summary

- **Total Confirmed Defects:** **25** (documented in [qa/DEFECT_INVENTORY.md](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/DEFECT_INVENTORY.md)).
- **Total Architectural Risks:** **2** (`WP-QA-002`, `WP-QA-008`).
- **Total Product Limitations:** **3** (`WP-QA-OBS-001` - `003`).
- **Production Code Modified in QA:** **0 files**.

---

## 24. Final Test Execution Results

```
======================================================================
                  WRIGHTPAY AUTOMATED QA RESULTS
======================================================================
  TypeScript Compilation (QA Automation)     :  PASS (0 errors)
  TypeScript Compilation (NestJS Backend)    :  PASS (0 errors)
  Jest Isolated Unit Tests                   :  130 / 130 PASS (1.73s)
  Backend API Integration Baseline           :  277 / 277 PASS (15.1s)
  Frontend Functional E2E Tests              :   49 /  49 PASS (18.0s)
  Accessibility WCAG 2.1 AA Scans            :   26 /  26 PASS (12.0s)
  Responsive Mobile/Tablet Tests             :   36 /  36 PASS (15.0s)
  API Error Handling & Resilience Tests      :   44 /  44 PASS (14.0s)
  Session Expiry & 401 Lifecycle Tests       :   46 /  46 PASS (16.0s)
  Known-Defect Regression Suite              :    9 /   9 EXPECTED FAILS
  k6 Load & Reliability Verification         :    6 /   6 SCENARIOS PASS
----------------------------------------------------------------------
  TOTAL FUNCTIONAL AUTOMATED TESTS           :  608 / 608 PASS (100%)
======================================================================
```

---

## 25. Known Architectural Risks

1. **Dual-Write Window (`WP-QA-002`):** Database transaction commits wallet debit before BullMQ job enqueue. If Redis fails between commit and enqueue, transaction remains orphaned in `PENDING`.
2. **Transfer Reference Entropy (`WP-QA-008`):** 32-bit random hex reference generator risks collision under extreme daily volumes.

---

## 26. Known Product Limitations

1. `/onboarding` is a client-side mock.
2. Flat 25.00 EUR transfer fee regardless of transaction amount.
3. Single EUR ledger with dynamic FX conversion equivalents.

---

## 27. Test-Environment Limitations

1. Local single-node Docker setup cannot simulate distributed network partitions across multi-region datacenters.
2. Single-worker BullMQ concurrency in local dev; production requires multi-worker concurrency and dead-letter queues.

---

## 28. Final Conclusions

The WrightPay platform demonstrates robust core backend financial mechanics: pessimistic row-level locking strictly prevents double debits, Redis distributed locking enforces idempotency under concurrency, and BullMQ retries handle transient worker failures.

However, significant frontend and interface gaps exist: the mobile responsive layout is unusable without a collapsible sidebar (`WP-QA-RESP-001`), accessibility requires label and modal focus remediation, and the frontend card client suffers from an enum casing mismatch (`WP-QA-009`).

This comprehensive QA artifact suite provides full traceability, reproducible defect scripts, and performance baselines to guide production hardening.

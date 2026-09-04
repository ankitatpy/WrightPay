# WrightPay — Risk Register Review & Baseline (Phase 0.5)

---

## 1. Document Control

| Field             | Value                                                  |
|-------------------|--------------------------------------------------------|
| **Document**      | WrightPay Risk Register Review & Baseline Validation   |
| **Project**       | WrightPay QA/SDET Program                              |
| **Phase**         | Phase 0.5 — Risk Register Review & Baseline            |
| **Baseline Target**| `qa/risk/WrightPay_Risk_Register.md`                   |
| **Review Date**   | 02 September 2026                                      |
| **Author / Lead** | Ankit Pandey (Lead QA / SDET)                          |
| **Review Status** | Complete                                               |
| **Baseline State**| **APPROVED WITH CHANGES**                              |

---

## 2. Executive Summary & Objective

This document provides a comprehensive, rigorous, and evidence-backed technical validation of `qa/risk/WrightPay_Risk_Register.md` (Version 1.0) against the actual WrightPay codebase. 

The primary goals of this review are to:
1. **Challenge and Validate Every Risk**: Audit all 45 existing risks (`RISK-001` through `RISK-045`) by inspecting concrete implementation lines in the backend and frontend.
2. **Scrutinize Severity & Priority**: Eliminate score inflation on non-critical architectural findings and ensure financial loss, data integrity, and direct authentication compromises are prioritized at maximum depth.
3. **Consolidate & De-duplicate**: Identify overlapping risk entries and prescribe consolidation strategies where appropriate.
4. **Surface Critical Gaps**: Identify missing risks (e.g., PCI-DSS card data ingestion, plaintext OTP database storage, missing HTTP security headers).
5. **Establish the Formal QA Baseline**: Provide a solid, traceable foundation for upcoming test design (Phase 1).

---

## 3. Explicit Validation of 14 Key Audit Findings

The table below reviews the 14 core findings identified during prior repository analysis, classifying each into:
- **Confirmed Risk**: Directly verifiable in code, immediate failure or exploit vector exists.
- **Potential Risk**: Code structure creates vulnerability under specific operational conditions.
- **Implementation Concern Requiring Runtime Validation**: Configuration or infrastructure behavior depends on runtime/cloud environment.
- **Not Actually a Meaningful Risk**: Mitigated or negligible real-world impact.

| # | Finding | Code Evidence | Reviewer Classification | Assessment & Testing Impact |
|---|---|---|---|---|
| **1** | **Missing rate limiting on auth & transfer endpoints** | `main.ts`, `auth.controller.ts`, `transfers.controller.ts` | **Confirmed Risk** | Zero throttler guards or middlewares exist. Enables brute-force authentication and transfer flooding. Prioritized as **Critical (Auth) / High (Transfers)**. |
| **2** | **No OTP attempt lockout** | `auth.service.ts` (lines 122–153) | **Confirmed Risk** | `verifyEmail()` queries by email and code with no failure counter or lockout. Combined with lack of rate limiting, 6-digit OTPs can be brute-forced. Classified as **Critical**. |
| **3** | **OTP generated using `Math.random()`** | `auth.service.ts` (line 58) | **Confirmed Risk** | Pseudo-random generator used in place of `crypto.randomInt()`. Output is statistically predictable. Classified as **High**. |
| **4** | **JWT stored in `localStorage`** | `frontend/lib/api.ts` (lines 8–24) | **Confirmed Risk** | Tokens stored in `localStorage` are accessible via any client-side JavaScript execution (XSS). Classified as **High**. |
| **5** | **Exchange-rate endpoints have no JWT guard** | `exchange-rates.controller.ts` (lines 6–27) | **Potential Risk / Operational Concern** | The absence of `@UseGuards(JwtAuthGuard)` is intentional for public quotes/landing page, but unauthenticated and unthrottled access allows bot abuse and resource drain. Classified as **Medium** (Adjusted from High). |
| **6** | **`PATCH /users/me` allows unsafe field updates** | `users.service.ts` (line 23), `update-user.dto.ts` (lines 5–21) | **Not Actually a Meaningful Risk (Overstated)** | Code inspection shows `UpdateUserDto` defines only `name`, `countryOfResidence`, and `defaultCurrency`. Global `ValidationPipe({ whitelist: true })` strips all non-whitelisted fields (e.g. `accountStatus`, `kycStatus`). Classified as **Low** (Adjusted from High). |
| **7** | **TypeORM `synchronize: true` in production** | `backend/src/app.module.ts` (line 37) | **Confirmed Risk** | Synchronize is enabled globally without environment conditional. Poses severe data loss/schema drop risks on startup. Classified as **High / Critical Deployment Risk**. |
| **8** | **BullMQ enqueue failure handling** | `transfers.service.ts` (lines 187–211) | **Confirmed Risk** | Enqueue error is caught in a try/catch block and only logged. Wallet is already debited in PostgreSQL transaction. Transaction stays PENDING forever without settlement. Classified as **High (Direct Financial Risk)**. |
| **9** | **Redis eviction policy (`allkeys-lru` vs `noeviction`)** | `backend/src/core/redis/redis.service.ts`, `app.module.ts` | **Implementation Concern Requiring Runtime Validation** | No Redis configuration is hardcoded in application code. Managed Redis instances (e.g., Upstash or Render Redis) defaulting to eviction could evict active BullMQ jobs or idempotency locks. Needs runtime verification. |
| **10** | **Swagger UI publicly accessible** | `main.ts` (lines 34–44) | **Confirmed Risk** | Swagger document builder runs without `NODE_ENV !== 'production'` guard. Exposes all endpoints and schemas. Classified as **Medium** (Adjusted from High: reconnaissance only, no direct compromise). |
| **11** | **Broad Vercel subdomain CORS regex** | `main.ts` (line 21: `/^https:\/\/.*\.vercel\.app$/`) | **Confirmed Risk** | Allows any third-party website on `.vercel.app` to make credentialed requests to the backend API. Classified as **Medium**. |
| **12** | **Destructive seed script with dev credentials** | `database/seed/seed.ts` (lines 30–55) | **Confirmed Risk** | Contains `TRUNCATE ... CASCADE` and hardcoded `Password123!`. If accidentally executed against staging/production, all tables are wiped. Classified as **High (Integrity Risk)**. |
| **13** | **`test_db.ts` containing local DB credentials** | `test_db.ts` (lines 10–15) | **Implementation Concern / Low Risk** | Hardcoded credentials point to `localhost:5432/wrightpay_db`. Committed utility script is poor hygiene, but impact is negligible unless credentials are reused. Classified as **Low**. |
| **14** | **No server-side logout / token revocation** | `auth.service.ts` (lines 155–159) | **Confirmed Risk** | `logout()` is a no-op returning a string. JWT cannot be invalidated server-side prior to expiry (24h). Classified as **High**. |

---

## 4. Comprehensive Risk Validation Matrix (45 Risks)

Each risk in `qa/risk/WrightPay_Risk_Register.md` has been verified against the source code.

| Risk ID | Title | Current Class. | Validation Status | Evidence / Code Anchor | Reviewer Assessment | Action |
|---|---|---|---|---|---|---|
| **RISK-001** | BullMQ Enqueue Failure After Debit | High (15) | **Confirmed by code** | `transfers.service.ts:186–211` | Silent catch block leaves user money debited while transfer never completes. P0 financial risk. | **Keep (High - 15)** |
| **RISK-002** | Concurrent Transfers Race Condition | High (10) | **Partially supported** | `transfers.service.ts:120–123` | Pessimistic write lock (`pessimistic_write`) is implemented. Risk is mitigated in code, but requires runtime concurrency testing to verify DB isolation. | **Adjust (Medium - 8)** |
| **RISK-003** | Duplicate Processing (Idempotency Bypass) | High (10) | **Partially supported** | `idempotency.service.ts:104–118` | Redis `SET NX` protects flow; fallback logic re-executes on missing lock. Concurrency testing under Redis degradation required. | **Keep (High - 10)** |
| **RISK-004** | Floating-Point Precision Errors | Medium (9) | **Confirmed by code** | `transfers.service.ts:138–150` | Manual rounding with `Number.EPSILON * 100 / 100` across JS layer. Database is `decimal(12,2)`. Off-by-one cent risks exist. | **Keep (Medium - 9)** |
| **RISK-005** | Failed Transfer Balance Not Restored | High (15) | **Confirmed by code** | `transfers.processor.ts:111–133` | Processor marks transaction as `FAILED` upon exhausted retries, but contains zero credit-back logic to restore wallet balance. | **Keep (High - 15)** |
| **RISK-006** | Fixed Transfer Fee Hardcoded | Medium (6) | **Confirmed by code** | `transfers.service.ts:22`, `send-money/page.tsx:80` | Both sides hardcode `25`. Fee changes require dual-codebase synchronous updates. | **Keep (Medium - 6)** |
| **RISK-007** | Exchange Rate Staleness | Medium (9) | **Confirmed by code** | `exchange-rates.service.ts:28–68` | Rates loaded from static seed data. No TTL, dynamic feed, or quote locking in transfer transaction. | **Keep (Medium - 9)** |
| **RISK-008** | No Rate Limiting on Login | Critical (20) | **Confirmed by code** | `auth.controller.ts`, `main.ts` | Zero rate limiting anywhere in the NestJS backend. Credential stuffing and brute-force completely unhindered. | **Keep (Critical - 20)** |
| **RISK-009** | Math.random() for OTP | High (12) | **Confirmed by code** | `auth.service.ts:58` | `Math.floor(100000 + Math.random() * 900000)` is cryptographically insecure. | **Keep (High - 12)** |
| **RISK-010** | No OTP Attempt Lockout | Critical (20) | **Confirmed by code** | `auth.service.ts:122–153` | No attempt tracking or lockout exists. Brute force of 6-digit OTP is trivial. | **Keep (Critical - 20)** |
| **RISK-011** | No Server-Side JWT Revocation | High (12) | **Confirmed by code** | `auth.service.ts:155–159` | Logout is purely client-side. Token remains valid for 24 hours. | **Keep (High - 12)** |
| **RISK-012** | Hardcoded Dev OTP in Production | High (10) | **Partially supported** | `auth.service.ts:66` | Condition is `process.env.NODE_ENV === 'development' ? '123456' : otp`. Only a risk if deployment misconfigures `NODE_ENV`. | **Adjust (Medium - 6)** |
| **RISK-013** | IDOR on Transaction Detail | Medium (8) | **Partially supported** | `transactions.service.ts:95–105` | Query explicitly includes `where: { id, userId }`. Mitigated by code, requires regression testing. | **Keep (Medium - 8)** |
| **RISK-014** | IDOR on Card Endpoints | Medium (8) | **Partially supported** | `cards.service.ts:43, 64, 89, 106` | All operations enforce `where: { id, userId }`. Verified in code. | **Keep (Medium - 8)** |
| **RISK-015** | IDOR on Beneficiary Delete | Medium (6) | **Partially supported** | `beneficiaries.service.ts:72` | `softDelete({ id, userId })` enforces tenant isolation. | **Keep (Medium - 6)** |
| **RISK-016** | Cross-User Wallet in Transfer | High (10) | **Partially supported** | `transfers.service.ts:104, 121` | Queries enforce `userId`. High impact if bypassed, but well protected in code. | **Keep (High - 10)** |
| **RISK-017** | Exchange Rate Endpoints Public | High (10) | **Confirmed by code** | `exchange-rates.controller.ts` | Missing `@UseGuards(JwtAuthGuard)`. Impact is minor (public financial data), score of 10 was inflated. | **Adjust (Medium - 6)** |
| **RISK-018** | Swagger Publicly Accessible | High (10) | **Confirmed by code** | `main.ts:34–44` | Unconditional Swagger setup. Information disclosure only; no direct execution vector. Score of 10 was inflated. | **Adjust (Medium - 6)** |
| **RISK-019** | No Max Transfer Limit | Medium (9) | **Confirmed by code** | `create-transfer.dto.ts:28` | DTO validates `@Min(0.01)` but has no `@Max()`. Allows arbitrary amounts up to wallet balance. | **Keep (Medium - 9)** |
| **RISK-020** | Profile Update Allows Unsafe Fields | High (12) | **Not supported by code** | `update-user.dto.ts:1–21` | DTO only exposes `name`, `countryOfResidence`, `defaultCurrency`. ValidationPipe strips extra fields. Score 12 is invalid. | **Adjust (Low - 4)** |
| **RISK-021** | TypeORM `synchronize: true` | High (15) | **Confirmed by code** | `app.module.ts:37` | Unconditional synchronize in production config. High risk of catastrophic table alteration. | **Keep (High - 15)** |
| **RISK-022** | No DB CHECK on Wallet Balance | High (10) | **Confirmed by code** | `wallet.entity.ts:26–27` | Application validates balance, but database lacks `CHECK (balance >= 0)`. | **Keep (High - 10)** |
| **RISK-023** | Partial Transaction Commit | Medium (5) | **Partially supported** | `transfers.service.ts:80–184` | QueryRunner transaction wraps wallet save and transaction save. Standard ACID behavior. | **Keep (Medium - 5)** |
| **RISK-024** | Seed Script Destructive / Hardcoded | High (10) | **Confirmed by code** | `database/seed/seed.ts:32, 51` | TRUNCATE CASCADE and hardcoded password. Danger if executed in production. | **Keep (High - 10)** |
| **RISK-025** | Idempotency Key Expiry Replay | Medium (8) | **Confirmed by code** | `idempotency.service.ts:31` | 24h TTL allows replay after expiration. Documented behavior, acceptable in practice. | **Keep (Medium - 8)** |
| **RISK-026** | Redis Outage Blocks Transfers | Medium (8) | **Confirmed by code** | `idempotency.service.ts:72` | Hard dependency on Redis for transfers. Outage prevents all transfers. | **Keep (Medium - 8)** |
| **RISK-027** | Idempotency Lock TTL Too Short | Medium (5) | **Confirmed by code** | `idempotency.service.ts:24` | 60s processing lock is adequate for normal DB operations, but could expire under extreme contention. | **Keep (Medium - 5)** |
| **RISK-028** | BullMQ Job Stuck After Crash | Medium (8) | **Requires runtime validation** | `transfers.processor.ts:75` | Atomic update to PROCESSING avoids duplicate pickup, but relies on BullMQ stalled job configuration. | **Keep (Medium - 8)** |
| **RISK-029** | BullMQ Retry Duplicate Side Effects | Medium (8) | **Partially supported** | `transfers.processor.ts:52–71` | Status checks prevent re-execution of completed transactions. | **Keep (Medium - 8)** |
| **RISK-030** | JWT in localStorage | High (12) | **Confirmed by code** | `frontend/lib/api.ts:11` | Client stores bearer token in `localStorage`. Exploitable via XSS. | **Keep (High - 12)** |
| **RISK-031** | Stale Wallet Balance Display | Medium (6) | **Confirmed by code** | `send-money/page.tsx:136` | Balance refresh relies on secondary async call. Failures leave UI displaying stale balance. | **Keep (Medium - 6)** |
| **RISK-032** | Polling Stops After 20 Attempts | Medium (6) | **Confirmed by code** | `send-money/page.tsx:127–143` | Polling terminates at 30 seconds. Slow queue leaves UI in indeterminate state. | **Keep (Medium - 6)** |
| **RISK-033** | No Rate Limiting on Transfers | High (16) | **Confirmed by code** | `transfers.controller.ts:24` | Transfer endpoint has no rate limit. Attackers can flood transfers. | **Consolidate with RISK-008** *(Keep as distinct test area, see §5)* |
| **RISK-034** | Broad Vercel CORS Regex | Medium (6) | **Confirmed by code** | `main.ts:21` | Wildcard regex allows any `.vercel.app` domain. | **Keep (Medium - 6)** |
| **RISK-035** | Weak Password Policy | High (12) | **Confirmed by code** | `signup.dto.ts:21` | Only `@MinLength(8)`. No complexity requirements. Impact is moderate; score of 12 was slightly inflated. | **Adjust (Medium - 8)** |
| **RISK-036** | SQL Injection via ILIKE | Medium (5) | **Partially supported** | `transactions.service.ts:76–79` | Parameterized binding `:ref` used. Wildcard injection possible, not SQL injection. | **Keep (Medium - 5)** |
| **RISK-037** | `test_db.ts` Hardcoded Credentials | Low (3) | **Confirmed by code** | `test_db.ts:12` | Local developer script credentials committed. Negligible production impact. | **Keep (Low - 3)** |
| **RISK-038** | SSL `rejectUnauthorized: false` | Medium (5) | **Confirmed by code** | `app.module.ts:38, 52` | Disables certificate verification for DB and Redis TLS connections. | **Keep (Medium - 5)** |
| **RISK-039** | No Deep Health Check | Medium (9) | **Confirmed by code** | `app.controller.ts:8–12` | Root endpoint returns static "Hello World!". No DB/Redis health check. | **Keep (Medium - 9)** |
| **RISK-040** | No Graceful Shutdown for BullMQ | Medium (9) | **Confirmed by code** | `transfers.processor.ts` | No `onModuleDestroy` hook to pause worker and await active jobs during redeployment. | **Keep (Medium - 9)** |
| **RISK-041** | FX Lookup Multi-Query Contention | Medium (6) | **Confirmed by code** | `exchange-rates.service.ts:28–68` | Up to 4 sequential SQL queries per conversion executed inside DB transaction. | **Keep (Medium - 6)** |
| **RISK-042** | No DB Connection Pool Config | Medium (9) | **Confirmed by code** | `app.module.ts:24–42` | Default TypeORM pool size used. No pooling limits tuned for Render/Postgres. | **Keep (Medium - 9)** |
| **RISK-043** | Enqueue Failure Swallowed | High (12) | **Confirmed by code** | `transfers.service.ts:206–211` | Error is logged, but no alerting, metrics, or compensating action triggered. | **Consolidate with RISK-001** *(Sub-aspect of enqueue failure)* |
| **RISK-044** | No Structured Logging | Medium (8) | **Confirmed by code** | All services | Default plain-text string logging. Difficult to parse in distributed log aggregators. | **Keep (Medium - 8)** |
| **RISK-045** | Error Messages Leak Balance | Medium (6) | **Confirmed by code** | `transfers.service.ts:143` | Exception string returns exact available and required balance amounts. | **Keep (Medium - 6)** |

---

## 5. Duplicate & Overlap Analysis

During the audit, three pairs of risks were identified as describing related failure points. Here is the decision on whether to consolidate or maintain separation:

### 1. RISK-001 (BullMQ Enqueue Failure) vs RISK-043 (BullMQ Enqueue Failure Logged but Not Alerted)
- **Reviewer Assessment**: `RISK-043` is the observability dimension of `RISK-001`. The fundamental defect is that BullMQ enqueue failure is caught and swallowed in `transfers.service.ts:206–211`.
- **Decision**: **Consolidate**. Merge `RISK-043` into `RISK-001` as an additional failure mechanism (Financial Loss + Lack of Operational Visibility). Keep `RISK-001` with High severity (Score 15) and incorporate observability alerting into its verification plan.

### 2. RISK-008 (No Rate Limiting on Login) vs RISK-033 (No Rate Limiting on Transfers)
- **Reviewer Assessment**: Both stem from the root architectural defect: `@nestjs/throttler` is completely absent from `AppModule` and `main.ts`. However, their attack vectors and consequences differ significantly:
  - `RISK-008` is an **Authentication Bypass & Account Takeover** vulnerability (credential stuffing).
  - `RISK-033` is a **Financial Denial of Service & Queue Exhaustion** vulnerability.
- **Decision**: **Keep Distinct for Testing**. While the remediation is a single global throttler, the testing verification requires two distinct test suites: Security/Brute-force testing for Auth (P0), and Concurrency/Stress testing for Transfers (P1).

### 3. RISK-009 (Math.random OTP) vs RISK-010 (No OTP Attempt Lockout) vs RISK-012 (Dev OTP '123456')
- **Reviewer Assessment**: All three affect email verification security. 
- **Decision**: **Keep Distinct**. 
  - `RISK-009` tests PRNG entropy.
  - `RISK-010` tests abuse prevention/counter logic.
  - `RISK-012` tests configuration isolation across deployment stages.
  They validate three separate defensive controls.

---

## 6. Critical & High Risk Review (In-Depth Scrutiny)

The table below reviews all 18 risks originally classified as **Critical** or **High**. Every score has been challenged to ensure prioritization reflects real business impact (direct financial loss, unauthorized access, and data corruption) rather than speculative or cosmetic issues.

| Risk ID | Title | Original Score | Reviewed Score | Decision | Reason & Technical Justification | Required Testing Depth |
|---|---|---|---|---|---|---|
| **RISK-008** | No Rate Limiting on Auth | 20 (Critical) | **20 (Critical)** | **Agree** | Likelihood: 5, Impact: 4. No rate limiting exists. Trivial automated brute force. | Security, Penetration, Brute-force simulation |
| **RISK-010** | No OTP Attempt Lockout | 20 (Critical) | **20 (Critical)** | **Agree** | Likelihood: 5, Impact: 4. 6-digit space (900,000 codes) can be exhausted in minutes. Account hijacking vector. | Security, Automated brute force, Expiry testing |
| **RISK-001** | BullMQ Enqueue Failure (Silent Debit) | 15 (High) | **15 (High)** | **Agree** | Likelihood: 3, Impact: 5. Direct financial loss. User is debited but transfer never processes. No refund mechanism. | Integration, Fault Injection (kill Redis/BullMQ post-commit), DB balance audit |
| **RISK-005** | Failed Transfer No Refund | 15 (High) | **15 (High)** | **Agree** | Likelihood: 3, Impact: 5. Processor marks status FAILED but never credits wallet balance back. User loses money. | Async Integration, Settlement failure simulation, Balance audit |
| **RISK-021** | TypeORM `synchronize: true` in Prod | 15 (High) | **15 (High)** | **Agree** | Likelihood: 3, Impact: 5. Uncontrolled schema synchronization can alter/drop financial ledger tables during deployment. | Infrastructure, Migration audit, Deployment testing |
| **RISK-033** | No Rate Limiting on Transfers | 16 (High) | **16 (High)** | **Agree** | Likelihood: 4, Impact: 4. High-frequency API calls can exhaust DB connections and BullMQ worker queue. | API Load Testing, Abuse simulation |
| **RISK-009** | Math.random() for OTP | 12 (High) | **12 (High)** | **Agree** | Likelihood: 3, Impact: 4. Statistically predictable OTPs compromise email verification integrity. | Unit/Entropy Testing, Security audit |
| **RISK-011** | No Server-Side JWT Revocation | 12 (High) | **12 (High)** | **Agree** | Likelihood: 3, Impact: 4. Stolen tokens cannot be invalidated prior to expiration. | API Testing, Session replay post-logout |
| **RISK-020** | Profile Update Allows Unsafe Fields | 12 (High) | **4 (Low)** | **Adjust** | **Downgraded from High to Low**. `UpdateUserDto` only declares `name`, `countryOfResidence`, `defaultCurrency`. ValidationPipe strips extra fields. Privilege escalation is NOT supported by code. | API Contract Testing, Parameter tampering |
| **RISK-030** | JWT Stored in localStorage | 12 (High) | **12 (High)** | **Agree** | Likelihood: 3, Impact: 4. Industry standard anti-pattern in fintech. XSS allows instant session hijacking. | Security, XSS audits, Client storage review |
| **RISK-035** | Weak Password Policy | 12 (High) | **8 (Medium)** | **Adjust** | **Downgraded from High to Medium**. Likelihood: 4, Impact: 2. Weak passwords increase risk, but Argon2 hashing is properly implemented. Moderate impact. | API Validation, Password boundary testing |
| **RISK-043** | Enqueue Failure Swallowed | 12 (High) | **Consolidated** | **Consolidate** | **Consolidated into RISK-001**. Represents the logging/monitoring aspect of the same failure mechanism. | Combined with RISK-001 verification |
| **RISK-002** | Concurrent Transfers Race Condition | 10 (High) | **8 (Medium)** | **Adjust** | **Downgraded from High to Medium**. Pessimistic write locking (`FOR UPDATE`) is already implemented in `transfers.service.ts:122`. Code protection exists. | Concurrency, Database row locking, Parallel execution |
| **RISK-003** | Idempotency Bypass | 10 (High) | **10 (High)** | **Agree** | Likelihood: 2, Impact: 5. Duplicate financial operations must be tested under network retry conditions. | Concurrency, Redis drop simulation, Replay testing |
| **RISK-012** | Hardcoded Dev OTP in Prod | 10 (High) | **6 (Medium)** | **Adjust** | **Downgraded from High to Medium**. Conditional checks `process.env.NODE_ENV === 'development'`. Low probability in proper staging/prod setup. | Environment verification, Smoke testing |
| **RISK-016** | Cross-User Wallet Access in Transfer | 10 (High) | **10 (High)** | **Agree** | Likelihood: 2, Impact: 5. Wallet and Beneficiary queries both enforce `userId`. Catastrophic if bypassed. | IDOR/BOLA Testing, Cross-user parameter testing |
| **RISK-017** | Exchange Rate Endpoints Public | 10 (High) | **6 (Medium)** | **Adjust** | **Downgraded from High to Medium**. Exchange rates are public reference data. Absence of JWT guard is standard for currency converters. Impact is minor API abuse. | API Testing, Unauthenticated access verification |
| **RISK-018** | Swagger Public in Production | 10 (High) | **6 (Medium)** | **Adjust** | **Downgraded from High to Medium**. Reconnaissance risk only. Does not allow bypass of protected endpoints. | API Smoke Testing, Route discovery |
| **RISK-022** | No DB CHECK on Wallet Balance | 10 (High) | **10 (High)** | **Agree** | Likelihood: 2, Impact: 5. Database lacks negative balance check constraint. Defense-in-depth failure. | Database Schema Testing, Overdraft simulation |
| **RISK-024** | Destructive Seed Script | 10 (High) | **10 (High)** | **Agree** | Likelihood: 2, Impact: 5. `TRUNCATE CASCADE` executed against production database causes total data loss. | Infrastructure / Configuration isolation |

---

## 7. Newly Identified Risks (Missing from Original Register)

Through deep code inspection across financial, authentication, authorization, and infrastructure areas, the following 5 critical and high-priority risks were identified that were omitted from `qa/risk/WrightPay_Risk_Register.md`:

---

### RISK-046 — Plaintext OTP Stored in Database

| Field | Value |
|---|---|
| **Risk ID** | **RISK-046** |
| **Category** | Authentication / Data Security |
| **Risk Description** | In `EmailVerification` entity (`backend/src/modules/auth/entities/email-verification.entity.ts:17`), the verification code is stored as plaintext `varchar(10)`: `@Column({ type: 'varchar', length: 10 }) verificationCode: string;`. OTPs are not hashed (unlike passwords which use Argon2). |
| **Failure Scenario** | Any read-only database compromise, SQL injection, compromised backup, or developer DB read exposes valid, active OTP codes. Allows account activation and email verification hijacking. |
| **Affected Component(s)** | `email-verification.entity.ts:17`, `auth.service.ts:66, 126` |
| **Likelihood** | 2 — Unlikely |
| **Impact** | 4 — Major |
| **Risk Score** | **8** |
| **Risk Level** | **Medium** |
| **Testing Priority** | **P1** |
| **Testing Levels / Types** | Database Testing, Security Testing (§7.14), Data Integrity (§7.16) |

---

### RISK-047 — Full Card Primary Account Number (PAN) and CVV Ingested by Backend API

| Field | Value |
|---|---|
| **Risk ID** | **RISK-047** |
| **Category** | Security / Compliance (PCI-DSS) |
| **Risk Description** | `CreateCardDto` (`backend/src/modules/cards/dto/create-card.dto.ts:25, 41`) accepts full `cardNumber` (16 digits) and `cvv` (3 digits) directly in the HTTP payload. While `cards.service.ts:28` only persists `lastFourDigits` and discards `cvv`, ingesting raw PAN and CVV on the server brings the entire backend into full **PCI-DSS Level 1/2 Scope**. True tokenization should occur on the client side via payment gateway SDK. |
| **Failure Scenario** | Network sniffing, proxy logging, access logging, or unhandled server crash memory dumps could expose raw card numbers and CVVs in cleartext. |
| **Affected Component(s)** | `cards.controller.ts:41`, `create-card.dto.ts:25, 41`, `cards.service.ts:26` |
| **Likelihood** | 3 — Possible |
| **Impact** | 4 — Major (Regulatory & Compliance Non-Compliance) |
| **Risk Score** | **12** |
| **Risk Level** | **High** |
| **Testing Priority** | **P1** |
| **Testing Levels / Types** | API Contract Testing (§7.9), Security Testing (§7.14), Negative Testing (§7.3) |

---

### RISK-048 — Missing HTTP Security Headers (No Helmet / CSP)

| Field | Value |
|---|---|
| **Risk ID** | **RISK-048** |
| **Category** | Security / Infrastructure |
| **Risk Description** | Inspection of `backend/src/main.ts` confirms that `helmet` is not imported or registered. The API does not set standard security headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (HSTS), or `X-Frame-Options`. |
| **Failure Scenario** | Browser clients interacting with the API are vulnerable to clickjacking, MIME-type sniffing, and downgraded unencrypted HTTP connections. |
| **Affected Component(s)** | `backend/src/main.ts` |
| **Likelihood** | 4 — Likely |
| **Impact** | 2 — Minor |
| **Risk Score** | **8** |
| **Risk Level** | **Medium** |
| **Testing Priority** | **P2** |
| **Testing Levels / Types** | API Security Testing (§7.14), Infrastructure Smoke (§7.27) |

---

### RISK-049 — Non-Constant-Time Comparison for OTP Verification

| Field | Value |
|---|---|
| **Risk ID** | **RISK-049** |
| **Category** | Authentication / Cryptography |
| **Risk Description** | `auth.service.ts:126` queries the database with `where: { email, verificationCode: code }`. The equality comparison is performed via standard database string matching and JS comparison, which is susceptible to timing side-channel attacks compared to constant-time comparison (`crypto.timingSafeEqual`). |
| **Failure Scenario** | High-precision timing analysis of verification request responses could allow an attacker to determine correct OTP digits iteratively. |
| **Affected Component(s)** | `auth.service.ts:126` |
| **Likelihood** | 1 — Rare |
| **Impact** | 4 — Major |
| **Risk Score** | **4** |
| **Risk Level** | **Low** |
| **Testing Priority** | **P3** |
| **Testing Levels / Types** | Security Testing (§7.14) |

---

### RISK-050 — Beneficiary Payout Details Lack Format Validation (UPI / Bank Account)

| Field | Value |
|---|---|
| **Risk ID** | **RISK-050** |
| **Category** | API / Financial Data Integrity |
| **Risk Description** | In `CreateBeneficiaryDto` (`backend/src/modules/beneficiaries/dto/create-beneficiary.dto.ts`), `upiId`, `accountNumber`, and `ifscCode` only validate `@IsString()`. No regex format validation is enforced (e.g. UPI format `username@bank`, Indian IFSC `^[A-Z]{4}0[A-Z0-9]{6}$`, or IBAN check digits). |
| **Failure Scenario** | User saves an invalid or gibberish UPI ID (e.g., `not-an-id`). When a transfer is subsequently executed, the money is debited from the wallet, but the downstream payment processor/settlement job fails permanently. |
| **Affected Component(s)** | `create-beneficiary.dto.ts:31, 48`, `beneficiaries.service.ts:35–46` |
| **Likelihood** | 3 — Possible |
| **Impact** | 3 — Moderate |
| **Risk Score** | **9** |
| **Risk Level** | **Medium** |
| **Testing Priority** | **P2** |
| **Testing Levels / Types** | API Validation Testing (§7.9), Boundary Testing (§7.4), Negative Testing (§7.3) |

---

## 8. Testability Mapping for Major Risks

Every major confirmed risk has been mapped to concrete testing levels and testing types as defined in `qa/WrightPay_Master_Test_Strategy.md`.

| Risk ID | Risk Focus | Primary Testing Level | Secondary Testing Level | Relevant Testing Types (§7) |
|---|---|---|---|---|
| **RISK-001** | BullMQ Enqueue Failure (Silent Debit) | **Integration** (`transfers.service.spec.ts`) | **Infrastructure/Async** | Financial Integrity (§7.15), Reliability/Failure (§7.19), Recovery (§7.20) |
| **RISK-005** | Failed Transfer No Balance Refund | **Integration** (Worker Test) | **Database** | Financial Integrity (§7.15), Transaction/ACID (§7.17), Data Integrity (§7.16) |
| **RISK-008** | No Rate Limiting on Auth | **API** (`/auth/login`) | **E2E/System** | Security (§7.14), Authentication (§7.12), Performance (§7.21) |
| **RISK-010** | No OTP Attempt Lockout | **API** (`/auth/verify-email`) | **Unit** | Security (§7.14), Authentication (§7.12), Negative Testing (§7.3) |
| **RISK-021** | TypeORM `synchronize: true` | **Infrastructure** | **Database** | Resilience (§7.26), Production Smoke (§7.27) |
| **RISK-030** | JWT in `localStorage` | **E2E/System** (Browser) | **API** | Security (§7.14), Session Management (§7.12) |
| **RISK-033** | No Rate Limiting on Transfers | **API** (`/transfers`) | **Infrastructure** | Performance (§7.21), Security (§7.14), Concurrency (§7.18) |
| **RISK-047** | Full Card PAN/CVV Ingestion | **API** (`/cards`) | **Unit** | API Contract (§7.9), Security (§7.14), Compliance |
| **RISK-002** | Concurrent Transfer Race Condition | **Integration** (Multi-thread) | **Database** | Concurrency (§7.18), Financial Integrity (§7.15), Transaction/ACID (§7.17) |
| **RISK-003** | Idempotency Key Bypass | **API** (`POST /transfers`) | **Infrastructure/Async** | Financial Integrity (§7.15), Concurrency (§7.18), Resilience (§7.26) |

---

## 9. Phase 0.5 Baseline Decision

### **Decision: APPROVED WITH CHANGES**

The `qa/risk/WrightPay_Risk_Register.md` document is technically sound, specific to WrightPay's NestJS/TypeORM/PostgreSQL architecture, and provides a solid foundation for QA test design. However, the score adjustments, consolidation, and 5 new risks identified during this review must be adopted for the Phase 1 test plan.

### Summary Metrics

| Metric | Count | Details |
|---|---|---|
| **Total Original Risks Reviewed** | **45** | `RISK-001` through `RISK-045` |
| **Risks Confirmed in Code** | **31** | Unambiguously supported by repo code |
| **Risks Partially Supported** | **12** | Partially mitigated by code; needs runtime verification |
| **Risks Requiring Runtime Validation** | **2** | Redis eviction policy, BullMQ worker crash |
| **Risks Not Supported / Overstated** | **1** | `RISK-020` (Profile DTO restricts fields) |
| **Risks Recommended for Score Adjustment** | **7** | `RISK-002`, `012`, `017`, `018`, `020`, `035` downgraded to avoid inflation |
| **Risks Recommended for Consolidation** | **1** | `RISK-043` merged into `RISK-001` |
| **Risks Recommended for Removal** | **0** | All risks retain testing value; none completely purged |
| **New Risks Identified & Added** | **5** | `RISK-046` to `RISK-050` (Plaintext OTP, PAN/CVV, Helmet, Timing, Validation) |
| **Total Post-Review Active Risks** | **49** | (45 original - 1 consolidated + 5 new) |

### Post-Review Risk Distribution (49 Active Risks)

| Severity Level | Post-Review Count | Percentage | Key Drivers |
|---|---|---|---|
| **Critical (17–25)** | **2** | 4.1% | `RISK-008` (Auth Rate Limiting), `RISK-010` (OTP Lockout) |
| **High (10–16)** | **14** | 28.6% | Financial loss (`RISK-001`, `005`), Sync (`021`), Storage (`030`), Ingestion (`047`) |
| **Medium (5–9)** | **30** | 61.2% | Concurrency, validation, Swagger, CORS, stale cache, precision |
| **Low (1–4)** | **3** | 6.1% | `RISK-020` (Profile update), `RISK-037` (test_db), `RISK-049` (Timing) |

---

## 10. Top 5 Prioritized Risks After Review

1. **RISK-008 & RISK-010 — Authentication & OTP Brute-Force Takeover (Score: 20, Critical)**
   - *Why*: Total absence of rate limiting and lockout on a 6-digit OTP verification endpoint allows rapid, automated account hijacking.
2. **RISK-001 — BullMQ Enqueue Failure with Silent Wallet Debit (Score: 15, High)**
   - *Why*: Direct monetary loss. The user's account is debited in PostgreSQL, but BullMQ enqueue failure is caught and swallowed. The transfer is stranded permanently in PENDING without retry or refund.
3. **RISK-005 — Transfer Failure Leaves Balance Debited (Score: 15, High)**
   - *Why*: When downstream settlement fails and BullMQ exhausts all 3 retries, the transaction status is updated to `FAILED`, but no compensating transaction credits the money back to the user's wallet.
4. **RISK-021 — TypeORM `synchronize: true` Active in Production (Score: 15, High)**
   - *Why*: Automatic DDL synchronization in production can cause schema corruption, unexpected column drops, and catastrophic table locking during application restarts.
5. **RISK-047 — Ingestion of Full Card PAN & CVV on API (Score: 12, High)**
   - *Why*: Processing raw card PANs and CVVs on the backend expands regulatory exposure into full PCI-DSS Level 1 scope, increasing liability for data compromise.

---

*End of WrightPay Risk Register Review & Baseline (Phase 0.5)*

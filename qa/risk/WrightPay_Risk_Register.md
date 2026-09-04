# WrightPay — Risk Register

---

## 1. Document Control

| Field             | Value                                      |
|-------------------|--------------------------------------------|
| **Document**      | WrightPay Risk Register                    |
| **Project**       | WrightPay                                  |
| **Document Type** | QA / Risk Assessment                       |
| **Version**       | 1.0                                        |
| **Status**        | Draft                                      |
| **QA Owner**      | Ankit Pandey                               |
| **Phase**         | Phase 0.4 — Risk Assessment                |
| **Last Updated**  | 02 September 2026                          |

### Revision History

| Version | Date               | Author        | Description                          |
|---------|--------------------|---------------|--------------------------------------|
| 1.0     | 02 September 2026  | Ankit Pandey  | Initial risk assessment baseline     |

---

## 2. Purpose

This document identifies, assesses, and prioritizes risks in the WrightPay system based on a **read-only inspection of the actual implementation**. Every risk listed is grounded in specific code, configuration, or architectural observations from the WrightPay repository.

This risk register drives the **risk-based testing strategy**: testing effort is allocated proportionally to risk severity, ensuring that the highest-impact failure scenarios receive the deepest and most rigorous testing coverage.

---

## 3. Methodology

### 3.1 Risk Scoring Formula

```
Risk Score = Likelihood × Impact
```

### 3.2 Likelihood Scale

| Score | Likelihood       | Description                                                 |
|-------|------------------|-------------------------------------------------------------|
| 1     | Rare             | Requires highly unusual circumstances                       |
| 2     | Unlikely         | Possible but not expected under normal conditions            |
| 3     | Possible         | Could occur during normal operation or testing               |
| 4     | Likely           | Expected to occur without specific preventive controls       |
| 5     | Almost Certain   | Will occur unless actively prevented                         |

### 3.3 Impact Scale

| Score | Impact              | Description                                                 |
|-------|---------------------|-------------------------------------------------------------|
| 1     | Negligible          | Cosmetic issue; no functional or financial impact            |
| 2     | Minor               | Minor inconvenience; easy workaround available               |
| 3     | Moderate            | Feature degraded; user experience impacted                   |
| 4     | Major               | Financial loss, data corruption, or significant security breach |
| 5     | Severe/Catastrophic | Systemic financial loss, complete data breach, or regulatory violation |

### 3.4 Risk Classification

| Risk Score | Risk Level  |
|------------|-------------|
| 1–4        | **Low**     |
| 5–9        | **Medium**  |
| 10–16      | **High**    |
| 17–25      | **Critical**|

---

## 4. Codebase Inspection Summary

The following components were inspected to identify risks. All references are to the actual WrightPay repository.

### Files Inspected

**Backend Core:**
- `backend/src/main.ts` — CORS, Swagger, ValidationPipe, global prefix
- `backend/src/app.module.ts` — TypeORM config (`synchronize: true`), BullMQ config, Redis config
- `backend/src/app.controller.ts` — Health/root endpoint

**Authentication & Authorization:**
- `backend/src/modules/auth/auth.service.ts` — Signup, login, OTP, email verification, logout
- `backend/src/modules/auth/auth.controller.ts` — Auth endpoints
- `backend/src/modules/auth/auth.module.ts` — JWT config (secret, expiry)
- `backend/src/modules/auth/dto/signup.dto.ts` — Signup validation
- `backend/src/modules/auth/entities/email-verification.entity.ts` — OTP persistence
- `backend/src/core/guards/jwt-auth.guard.ts` — JWT verification guard
- `backend/src/core/decorators/current-user.decorator.ts` — User extraction

**Financial / Transfers:**
- `backend/src/modules/transfers/transfers.service.ts` — Transfer orchestration, pessimistic locking, fee, FX
- `backend/src/modules/transfers/transfers.controller.ts` — Transfer endpoint, idempotency key
- `backend/src/modules/transfers/transfers.module.ts` — Module wiring
- `backend/src/modules/transfers/dto/create-transfer.dto.ts` — Transfer input validation
- `backend/src/modules/transfers/services/idempotency.service.ts` — Redis idempotency
- `backend/src/modules/transfers/processors/transfers.processor.ts` — BullMQ worker
- `backend/src/modules/transfers/constants/transfers.constants.ts` — Queue constants

**Wallets:**
- `backend/src/modules/wallets/wallets.service.ts` — Wallet retrieval, equivalents
- `backend/src/modules/wallets/wallets.controller.ts` — Wallet endpoint
- `backend/src/modules/wallets/entities/wallet.entity.ts` — Wallet schema (decimal 12,2)

**Transactions:**
- `backend/src/modules/transactions/transactions.service.ts` — Transaction queries, pagination
- `backend/src/modules/transactions/transactions.controller.ts` — Transaction endpoints
- `backend/src/modules/transactions/entities/transaction.entity.ts` — Transaction schema, status enum

**Other Modules:**
- `backend/src/modules/beneficiaries/beneficiaries.service.ts` — Beneficiary CRUD, max-3 limit
- `backend/src/modules/beneficiaries/beneficiaries.controller.ts` — Beneficiary endpoints
- `backend/src/modules/beneficiaries/entities/beneficiary.entity.ts` — Beneficiary schema, soft delete
- `backend/src/modules/cards/cards.service.ts` — Card CRUD, state transitions
- `backend/src/modules/cards/cards.controller.ts` — Card endpoints
- `backend/src/modules/cards/entities/card.entity.ts` — Card schema, status enum
- `backend/src/modules/users/users.service.ts` — User profile
- `backend/src/modules/users/users.controller.ts` — User endpoints
- `backend/src/modules/users/entities/user.entity.ts` — User schema, account status
- `backend/src/modules/exchange-rates/exchange-rates.service.ts` — Rate lookup, triangulation
- `backend/src/modules/exchange-rates/exchange-rates.controller.ts` — Rate/quote endpoints (**no auth guard**)
- `backend/src/modules/exchange-rates/entities/exchange-rate.entity.ts` — Rate schema

**Infrastructure:**
- `backend/src/core/redis/redis.service.ts` — Redis client wrapper
- `backend/src/database/seed/seed.ts` — Seed script with TRUNCATE CASCADE and hardcoded credentials
- `test_db.ts` — Root-level DB utility with local credentials

**Frontend:**
- `frontend/lib/api.ts` — API client, localStorage token, error handling
- `frontend/lib/auth-context.tsx` — Auth state, login/logout/signup flows
- `frontend/lib/api/transfers.ts` — Transfer API with idempotency key
- `frontend/lib/api/wallets.ts`, `beneficiaries.ts`, `cards.ts`, `transactions.ts`, `exchange-rates.ts`, `users.ts`
- `frontend/app/dashboard/send-money/page.tsx` — Multi-step transfer UI, polling
- `frontend/app/login/`, `signup/`, `verify-email/` — Auth pages

**Configuration:**
- `.env.example` — Environment template
- `frontend/.env.local` — Frontend env
- `.gitignore` — Secret exclusion

---

## 5. Risk Register

### 5.1 Financial Risks

---

#### RISK-001 — BullMQ Enqueue Failure After Wallet Debit

| Field | Value |
|---|---|
| **Risk ID** | RISK-001 |
| **Category** | Financial |
| **Risk Description** | If the BullMQ `transfersQueue.add()` call fails after the PostgreSQL transaction has already committed (wallet debited, transaction record created as PENDING), the transfer will never be processed by the worker. The user's wallet is debited but the transfer never completes. |
| **Failure Scenario** | Redis is temporarily unavailable or BullMQ queue is full. The `try/catch` in `transfers.service.ts` (lines 187–211) catches the error and **only logs it** — the API still returns success to the client with the debited amount. |
| **Affected Component(s)** | `transfers.service.ts` (lines 186–211), BullMQ, Redis |
| **Likelihood** | 3 — Possible |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **15** |
| **Risk Level** | **High** |
| **Business Impact** | User loses money — wallet debited but transfer never settles. Transaction remains PENDING indefinitely. No automated recovery mechanism observed. |
| **Detection Strategy** | Monitor for transactions stuck in PENDING status beyond expected processing time. Alert on BullMQ enqueue failures in application logs. |
| **Testing Strategy** | Simulate Redis/BullMQ unavailability after DB commit. Verify transaction state, wallet balance, and recovery behavior. |
| **Mitigation / Control** | Consider: compensating transaction on enqueue failure, scheduled reconciliation job, or transactional outbox pattern. |
| **Status** | Open — Requires validation during testing |

---

#### RISK-002 — Concurrent Transfers Against Same Wallet — Race Condition

| Field | Value |
|---|---|
| **Risk ID** | RISK-002 |
| **Category** | Financial |
| **Risk Description** | Two simultaneous transfer requests against the same wallet could cause incorrect balance calculations if the pessimistic write lock (`FOR UPDATE`) does not serialize correctly under all conditions. |
| **Failure Scenario** | Two API requests arrive simultaneously. The pessimistic lock on `wallet.entity` (line 122 of `transfers.service.ts`) should serialize access, but testing must verify this under real concurrency with PostgreSQL. |
| **Affected Component(s)** | `transfers.service.ts` (line 120–123), PostgreSQL row locking, `wallet.entity.ts` |
| **Likelihood** | 2 — Unlikely (pessimistic lock is implemented) |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **10** |
| **Risk Level** | **High** |
| **Business Impact** | Double-debit, phantom balance, money created or lost. |
| **Detection Strategy** | Concurrent transfer tests with balance assertions. Database balance audit after concurrent operations. |
| **Testing Strategy** | Execute multiple concurrent transfers against the same wallet. Verify final balance = initial balance − sum(all debits + fees). |
| **Mitigation / Control** | Pessimistic write lock is implemented. Must be validated under real concurrency. |
| **Status** | Open — Requires concurrency testing |

---

#### RISK-003 — Duplicate Transfer Processing (Idempotency Bypass)

| Field | Value |
|---|---|
| **Risk ID** | RISK-003 |
| **Category** | Financial |
| **Risk Description** | If Redis is temporarily unavailable during the idempotency check, the `SET NX` may fail, and the recursive retry logic in `idempotency.service.ts` (lines 108–118) could allow duplicate execution. |
| **Failure Scenario** | Redis goes down momentarily. The `SET NX` returns null. The `GET` also returns null (line 108). The code retries recursively — but if Redis recovers between the failed SET and the retry, a second execution could begin while the first is already in-flight. |
| **Affected Component(s)** | `idempotency.service.ts` (lines 104–118), Redis |
| **Likelihood** | 2 — Unlikely |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **10** |
| **Risk Level** | **High** |
| **Business Impact** | Duplicate financial operation — user debited twice for the same transfer. |
| **Detection Strategy** | Test idempotency under Redis failure/recovery scenarios. Verify no duplicate transactions exist in database. |
| **Testing Strategy** | Simulate Redis intermittent failures during transfer. Replay identical requests. Verify single debit and single transaction record. |
| **Mitigation / Control** | Idempotency service implemented with SET NX + payload hash. PostgreSQL pessimistic lock provides secondary protection. |
| **Status** | Open — Requires validation under Redis failure conditions |

---

#### RISK-004 — Floating-Point Precision Errors in Financial Calculations

| Field | Value |
|---|---|
| **Risk ID** | RISK-004 |
| **Category** | Financial |
| **Risk Description** | Transfer amounts, fees, and exchange-rate conversions use JavaScript floating-point arithmetic with manual `Math.round()` rounding. Edge cases could produce off-by-one-cent errors. |
| **Failure Scenario** | `transfers.service.ts` uses `Math.round((value + Number.EPSILON) * 100) / 100` (lines 138–150). Certain decimal combinations may round incorrectly due to IEEE 754 floating-point representation. |
| **Affected Component(s)** | `transfers.service.ts` (lines 137–150), `wallets.service.ts` (lines 51–58), `exchange-rates.service.ts` (line 79) |
| **Likelihood** | 3 — Possible |
| **Impact** | 3 — Moderate |
| **Risk Score** | **9** |
| **Risk Level** | **Medium** |
| **Business Impact** | Fractional financial discrepancy. Wallet balance may be off by 0.01 after certain operations. |
| **Detection Strategy** | Boundary value testing with amounts that trigger floating-point edge cases (e.g., 0.1 + 0.2, amounts with many decimal places). |
| **Testing Strategy** | Test transfer calculations with known-difficult decimal values. Verify balance accuracy to the cent after operations. |
| **Mitigation / Control** | Database uses `decimal(12,2)` which provides correct storage. Risk is in the JavaScript computation layer before persistence. |
| **Status** | Open — Requires boundary testing |

---

#### RISK-005 — Transfer Marked as FAILED but Wallet Balance Not Restored

| Field | Value |
|---|---|
| **Risk ID** | RISK-005 |
| **Category** | Financial |
| **Risk Description** | When the BullMQ processor marks a transaction as FAILED (line 120–129 of `transfers.processor.ts`), the wallet balance was already debited during the initial PostgreSQL transaction. No balance restoration (credit-back) logic is observed in the processor. |
| **Failure Scenario** | Transfer initiation debits wallet. BullMQ job fails after all retries. Transaction is marked FAILED. Wallet balance remains debited. |
| **Affected Component(s)** | `transfers.processor.ts` (lines 111–133), `transfers.service.ts` (lines 149–152) |
| **Likelihood** | 3 — Possible |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **15** |
| **Risk Level** | **High** |
| **Business Impact** | User loses money — wallet debited for a transfer that never completed. No compensating transaction observed in code. |
| **Detection Strategy** | Trigger transfer failures (use SIMULATE_FAILURE recipient). Verify wallet balance after FAILED status. |
| **Testing Strategy** | Create transfers with SIMULATE_FAILURE recipient. Exhaust retry attempts. Verify wallet balance is restored or compensated. |
| **Mitigation / Control** | None observed in current code. Requires either balance restoration in processor failure path or reconciliation process. |
| **Status** | Open — Requires validation |

---

#### RISK-006 — Fixed Transfer Fee Not Configurable

| Field | Value |
|---|---|
| **Risk ID** | RISK-006 |
| **Category** | Financial |
| **Risk Description** | Transfer fee is hardcoded as `TRANSFER_FEE = 25.0` in `transfers.service.ts` (line 22). The frontend also hardcodes `fixedFee = 25` in `send-money/page.tsx` (line 80). No environment variable or database configuration. |
| **Failure Scenario** | If the fee changes, both backend and frontend must be updated simultaneously. A mismatch would display incorrect fee information to the user. |
| **Affected Component(s)** | `transfers.service.ts` (line 22), `frontend/app/dashboard/send-money/page.tsx` (line 80) |
| **Likelihood** | 2 — Unlikely |
| **Impact** | 3 — Moderate |
| **Risk Score** | **6** |
| **Risk Level** | **Medium** |
| **Business Impact** | Fee mismatch between UI and actual deduction. User sees incorrect total before confirming transfer. |
| **Detection Strategy** | API contract tests comparing frontend fee constant with backend fee constant. |
| **Testing Strategy** | Verify fee displayed in UI matches fee deducted in API response and database. |
| **Mitigation / Control** | Centralize fee configuration. Frontend should fetch fee from API rather than hardcoding. |
| **Status** | Open |

---

#### RISK-007 — Exchange Rate Staleness

| Field | Value |
|---|---|
| **Risk ID** | RISK-007 |
| **Category** | Financial |
| **Risk Description** | Exchange rates are stored in PostgreSQL as static seed data. No rate refresh mechanism, no TTL, and no staleness check observed. The quote shown to the user during transfer review may differ from the rate applied during transfer execution. |
| **Failure Scenario** | User fetches a quote, waits, then submits. The rate may have been updated between quote and execution (if updates are ever implemented), or the rate is stale from seed time. |
| **Affected Component(s)** | `exchange-rates.service.ts`, `exchange_rates` table, `transfers.service.ts` (line 130–133) |
| **Likelihood** | 3 — Possible |
| **Impact** | 3 — Moderate |
| **Risk Score** | **9** |
| **Risk Level** | **Medium** |
| **Business Impact** | User receives a different conversion amount than quoted. Financial discrepancy between preview and actual transfer. |
| **Detection Strategy** | Compare quote rate at review time with rate applied at transfer execution time. |
| **Testing Strategy** | Fetch quote, then execute transfer. Verify the applied rate matches the quoted rate. Test with rate changes between quote and transfer. |
| **Mitigation / Control** | Consider rate locking at quote time with TTL, or displaying "rate may vary" disclaimer. |
| **Status** | Open — Requires validation |

---

### 5.2 Authentication Risks

---

#### RISK-008 — No Rate Limiting on Login Endpoint

| Field | Value |
|---|---|
| **Risk ID** | RISK-008 |
| **Category** | Authentication |
| **Risk Description** | No `ThrottlerGuard` or rate-limiting middleware is applied to the `/auth/login` endpoint or any other endpoint. Confirmed by codebase search — zero instances of `ThrottlerGuard` or throttle-related imports. |
| **Failure Scenario** | Attacker performs automated credential brute-force against `/auth/login`. No request throttling prevents unlimited login attempts. |
| **Affected Component(s)** | `auth.controller.ts`, `main.ts`, entire backend — no rate limiting configured |
| **Likelihood** | 5 — Almost Certain |
| **Impact** | 4 — Major |
| **Risk Score** | **20** |
| **Risk Level** | **Critical** |
| **Business Impact** | Account compromise through brute-force attack. Credential stuffing attacks unmitigated. |
| **Detection Strategy** | Send 1000+ login requests per minute. Verify no throttling or lockout occurs. |
| **Testing Strategy** | Automated brute-force simulation against login, signup, verify-email, and transfer endpoints. Verify absence of rate limiting. |
| **Mitigation / Control** | Implement NestJS `@nestjs/throttler` with appropriate rate limits on sensitive endpoints. |
| **Status** | Open — Confirmed finding |

---

#### RISK-009 — OTP Generated Using Math.random()

| Field | Value |
|---|---|
| **Risk ID** | RISK-009 |
| **Category** | Authentication |
| **Risk Description** | Email verification OTP is generated using `Math.floor(100000 + Math.random() * 900000)` in `auth.service.ts` (line 58). `Math.random()` is not cryptographically secure and its output may be predictable. |
| **Failure Scenario** | Attacker observes timing or statistical patterns in OTP generation to predict future OTPs. In development mode, OTP is hardcoded to `123456` (line 66). |
| **Affected Component(s)** | `auth.service.ts` (lines 58, 66) |
| **Likelihood** | 3 — Possible |
| **Impact** | 4 — Major |
| **Risk Score** | **12** |
| **Risk Level** | **High** |
| **Business Impact** | Account takeover via OTP prediction. Bypassed email verification allows unauthorized account activation. |
| **Detection Strategy** | Generate multiple OTPs and analyze distribution/predictability. Verify dev mode fixed OTP is not active in production. |
| **Testing Strategy** | Verify OTP randomness. Verify `123456` is not accepted in production. Test OTP uniqueness across multiple signups. |
| **Mitigation / Control** | Replace `Math.random()` with `crypto.randomInt()`. Remove hardcoded dev OTP or gate it behind strict env check. |
| **Status** | Open — Confirmed finding |

---

#### RISK-010 — No OTP Attempt Lockout

| Field | Value |
|---|---|
| **Risk ID** | RISK-010 |
| **Category** | Authentication |
| **Risk Description** | The `verifyEmail` method in `auth.service.ts` (lines 122–153) does not track failed verification attempts. There is no lockout after repeated incorrect OTP submissions. |
| **Failure Scenario** | Attacker brute-forces all 900,000 possible 6-digit OTP codes against `/auth/verify-email`. Combined with no rate limiting (RISK-008), this is trivially exploitable. |
| **Affected Component(s)** | `auth.service.ts` (lines 122–153), `auth.controller.ts` |
| **Likelihood** | 5 — Almost Certain (with no rate limiting) |
| **Impact** | 4 — Major |
| **Risk Score** | **20** |
| **Risk Level** | **Critical** |
| **Business Impact** | Attacker verifies any email, activates accounts they don't own, or bypasses email verification entirely. |
| **Detection Strategy** | Submit hundreds of incorrect OTP values. Verify no lockout or throttling occurs. |
| **Testing Strategy** | Automated OTP brute-force test. Verify max attempt enforcement. Test OTP expiry (15-minute window observed). |
| **Mitigation / Control** | Implement attempt counter with lockout after N failures. Combine with rate limiting. |
| **Status** | Open — Confirmed finding |

---

#### RISK-011 — No Server-Side JWT Revocation (Logout Is Client-Side Only)

| Field | Value |
|---|---|
| **Risk ID** | RISK-011 |
| **Category** | Authentication |
| **Risk Description** | The `logout` method in `auth.service.ts` (lines 155–159) returns a static success message. No server-side token blacklist or revocation is implemented. JWT remains valid until expiry. |
| **Failure Scenario** | User logs out. A stolen or cached JWT continues to be valid for up to 24 hours (configured expiry). Attacker uses the token to access the user's account. |
| **Affected Component(s)** | `auth.service.ts` (lines 155–159), `jwt-auth.guard.ts`, frontend `auth-context.tsx` |
| **Likelihood** | 3 — Possible |
| **Impact** | 4 — Major |
| **Risk Score** | **12** |
| **Risk Level** | **High** |
| **Business Impact** | Compromised session cannot be terminated. Stolen token remains usable after logout. |
| **Detection Strategy** | Logout, then use the same JWT to access protected endpoints. Verify access is still granted. |
| **Testing Strategy** | Login, capture JWT, logout via API, then reuse JWT against protected endpoints. Verify behavior. |
| **Mitigation / Control** | Implement Redis-based token blacklist checked in `JwtAuthGuard`. Alternatively, use short-lived tokens with refresh token rotation. |
| **Status** | Open — Confirmed finding |

---

#### RISK-012 — Hardcoded Development OTP in Production Risk

| Field | Value |
|---|---|
| **Risk ID** | RISK-012 |
| **Category** | Authentication |
| **Risk Description** | In `auth.service.ts` (line 66), OTP is set to `'123456'` when `NODE_ENV === 'development'`. If `NODE_ENV` is not explicitly set in production, or is set incorrectly, the fixed OTP would be active. |
| **Failure Scenario** | Production environment variable `NODE_ENV` not set → defaults to undefined → condition `NODE_ENV === 'development'` is false → production uses random OTP. However, if misconfigured as `'development'`, all accounts use `123456`. |
| **Affected Component(s)** | `auth.service.ts` (line 66), environment configuration |
| **Likelihood** | 2 — Unlikely (requires misconfiguration) |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **10** |
| **Risk Level** | **High** |
| **Business Impact** | Any account can be verified with `123456`, allowing mass unauthorized account activation. |
| **Detection Strategy** | Verify `NODE_ENV` in production. Attempt `123456` verification against production. |
| **Testing Strategy** | Test OTP `123456` against non-development environments. Verify environment variable configuration. |
| **Mitigation / Control** | Remove hardcoded OTP. Use environment-specific OTP delivery (email in production, logs in development). |
| **Status** | Open — Requires environment validation |

---

### 5.3 Authorization / Multi-Tenancy Risks

---

#### RISK-013 — IDOR/BOLA on Transaction Detail Endpoint

| Field | Value |
|---|---|
| **Risk ID** | RISK-013 |
| **Category** | Authorization / Multi-Tenancy |
| **Risk Description** | The `GET /transactions/:id` endpoint in `transactions.service.ts` (lines 95–105) filters by `{ id, userId }`, which should prevent cross-user access. This pattern must be verified for all parameterized endpoints. |
| **Failure Scenario** | User A obtains User B's transaction UUID and requests `GET /transactions/{userB-txn-id}`. The `where: { id, userId }` clause should return 404, but this must be verified. |
| **Affected Component(s)** | `transactions.controller.ts`, `transactions.service.ts`, all controllers with `:id` parameters |
| **Likelihood** | 2 — Unlikely (userId filter implemented) |
| **Impact** | 4 — Major |
| **Risk Score** | **8** |
| **Risk Level** | **Medium** |
| **Business Impact** | Cross-user data exposure — financial transaction details leaked to unauthorized user. |
| **Detection Strategy** | Authenticate as User A, request User B's resources by UUID across all parameterized endpoints. |
| **Testing Strategy** | Systematic IDOR testing on: transactions, wallets, beneficiaries, cards. Verify 404 for cross-user resource access. |
| **Mitigation / Control** | All observed controllers include `userId` in queries. Requires exhaustive verification. |
| **Status** | Open — Requires systematic IDOR testing |

---

#### RISK-014 — IDOR/BOLA on Card Endpoints

| Field | Value |
|---|---|
| **Risk ID** | RISK-014 |
| **Category** | Authorization / Multi-Tenancy |
| **Risk Description** | Card endpoints (`freeze`, `unfreeze`, `deactivate`, `delete`) accept `:id` parameter. The `cards.service.ts` uses `{ id, userId }` in queries. Must be verified. |
| **Failure Scenario** | User A sends `POST /cards/{userB-card-id}/freeze`. If userId is not enforced, User A could freeze User B's card. |
| **Affected Component(s)** | `cards.controller.ts`, `cards.service.ts` (all state-change methods) |
| **Likelihood** | 2 — Unlikely (userId filter observed) |
| **Impact** | 4 — Major |
| **Risk Score** | **8** |
| **Risk Level** | **Medium** |
| **Business Impact** | Unauthorized modification of another user's card state. |
| **Detection Strategy** | Authenticate as User A, attempt all card operations with User B's card ID. |
| **Testing Strategy** | Cross-user card access tests: freeze, unfreeze, deactivate, delete with another user's card UUID. |
| **Mitigation / Control** | userId filter observed in all card service methods. Requires verification. |
| **Status** | Open — Requires IDOR testing |

---

#### RISK-015 — IDOR/BOLA on Beneficiary Delete

| Field | Value |
|---|---|
| **Risk ID** | RISK-015 |
| **Category** | Authorization / Multi-Tenancy |
| **Risk Description** | The `DELETE /beneficiaries/:id` endpoint uses `softDelete({ id, userId })` in `beneficiaries.service.ts` (line 72). Must verify that userId enforcement is effective. |
| **Failure Scenario** | User A deletes User B's beneficiary, disrupting User B's transfer capability. |
| **Affected Component(s)** | `beneficiaries.controller.ts`, `beneficiaries.service.ts` |
| **Likelihood** | 2 — Unlikely (userId filter in softDelete) |
| **Impact** | 3 — Moderate |
| **Risk Score** | **6** |
| **Risk Level** | **Medium** |
| **Business Impact** | Unauthorized deletion of another user's beneficiary. |
| **Detection Strategy** | Authenticate as User A, attempt to delete User B's beneficiary by UUID. |
| **Testing Strategy** | Cross-user beneficiary deletion test. Verify no affected rows when userId doesn't match. |
| **Mitigation / Control** | userId included in softDelete where clause. |
| **Status** | Open — Requires IDOR testing |

---

#### RISK-016 — Transfer Using Another User's Wallet or Beneficiary

| Field | Value |
|---|---|
| **Risk ID** | RISK-016 |
| **Category** | Authorization / Multi-Tenancy |
| **Risk Description** | The transfer creation in `transfers.service.ts` verifies beneficiary ownership (`where: { id: beneficiaryId, userId }`, line 104–106) and wallet ownership (`where: { id: sourceWalletId, userId }`, line 120–123). Must verify these checks cannot be bypassed. |
| **Failure Scenario** | User A submits a transfer with User B's wallet ID as `sourceWalletId`. The query should return 404, but requires verification. |
| **Affected Component(s)** | `transfers.service.ts` (lines 104–127) |
| **Likelihood** | 2 — Unlikely (ownership checks observed) |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **10** |
| **Risk Level** | **High** |
| **Business Impact** | Unauthorized debit from another user's wallet — direct financial theft. |
| **Detection Strategy** | Authenticate as User A, submit transfer with User B's wallet ID and beneficiary ID. |
| **Testing Strategy** | Cross-user transfer tests: User A's token + User B's wallet/beneficiary UUIDs. Verify rejection. |
| **Mitigation / Control** | Ownership validation implemented. Requires exhaustive verification. |
| **Status** | Open — Requires IDOR testing |

---

### 5.4 API Risks

---

#### RISK-017 — Exchange Rate Endpoints Publicly Accessible (No Authentication)

| Field | Value |
|---|---|
| **Risk ID** | RISK-017 |
| **Category** | API |
| **Risk Description** | The `exchange-rates.controller.ts` does not use `@UseGuards(JwtAuthGuard)`. Both `GET /exchange-rates` and `GET /exchange-rates/quote` are accessible without authentication. |
| **Failure Scenario** | Unauthenticated users or bots scrape exchange rates and quotes continuously. May enable competitive intelligence gathering or API abuse. |
| **Affected Component(s)** | `exchange-rates.controller.ts` |
| **Likelihood** | 5 — Almost Certain |
| **Impact** | 2 — Minor |
| **Risk Score** | **10** |
| **Risk Level** | **High** |
| **Business Impact** | API abuse, excessive infrastructure cost, potential information exposure. Low financial impact but high operational risk without rate limiting. |
| **Detection Strategy** | Send unauthenticated requests to exchange-rate endpoints. Verify they respond with 200. |
| **Testing Strategy** | Verify authentication requirement (or lack thereof). Test with and without JWT. |
| **Mitigation / Control** | Evaluate whether exchange rates should require authentication. At minimum, apply rate limiting. |
| **Status** | Open — Confirmed finding |

---

#### RISK-018 — Swagger/API Documentation Publicly Accessible in Production

| Field | Value |
|---|---|
| **Risk ID** | RISK-018 |
| **Category** | API |
| **Risk Description** | Swagger is configured unconditionally in `main.ts` (lines 34–44) at `/api/docs`. No environment check prevents Swagger from being available in production. |
| **Failure Scenario** | Attacker accesses production Swagger UI, discovers all API endpoints, request/response schemas, and authorization requirements, enabling targeted attacks. |
| **Affected Component(s)** | `main.ts` (lines 34–44) |
| **Likelihood** | 5 — Almost Certain |
| **Impact** | 2 — Minor |
| **Risk Score** | **10** |
| **Risk Level** | **High** |
| **Business Impact** | Information disclosure. API reconnaissance made trivial for attackers. |
| **Detection Strategy** | Access `/api/docs` in production. Verify Swagger UI renders. |
| **Testing Strategy** | Test Swagger accessibility across environments. Verify Swagger is disabled or restricted in production. |
| **Mitigation / Control** | Gate Swagger setup behind `NODE_ENV !== 'production'` check. |
| **Status** | Open — Confirmed finding |

---

#### RISK-019 — No Maximum Transfer Amount Validation

| Field | Value |
|---|---|
| **Risk ID** | RISK-019 |
| **Category** | API |
| **Risk Description** | The `CreateTransferDto` only validates `@Min(0.01)` for `sendAmount`. No `@Max()` decorator or business rule limits the maximum transfer amount. |
| **Failure Scenario** | User submits a transfer for an extremely large amount (e.g., 9999999999.99). If the wallet has sufficient balance, the transfer proceeds with no upper limit check. |
| **Affected Component(s)** | `create-transfer.dto.ts` (line 28), `transfers.service.ts` |
| **Likelihood** | 3 — Possible |
| **Impact** | 3 — Moderate |
| **Risk Score** | **9** |
| **Risk Level** | **Medium** |
| **Business Impact** | No transaction limit enforcement. Could be abused for money laundering or fraudulent large transfers. |
| **Detection Strategy** | Submit transfers with very large amounts. Verify acceptance/rejection behavior. |
| **Testing Strategy** | Boundary testing: maximum amount, amounts exceeding decimal(12,2) precision, amounts at/beyond wallet balance. |
| **Mitigation / Control** | Implement per-transaction and daily transfer limits as business rules. |
| **Status** | Open — Requires validation |

---

#### RISK-020 — UpdateUserDto Allows Uncontrolled Profile Field Updates

| Field | Value |
|---|---|
| **Risk ID** | RISK-020 |
| **Category** | API |
| **Risk Description** | The `PATCH /users/me` endpoint passes `updateUserDto` directly to `this.userRepository.update()` in `users.service.ts` (line 23). If the DTO does not strictly restrict which fields can be updated, a user could modify sensitive fields like `accountStatus`, `kycStatus`, or `accountType`. |
| **Failure Scenario** | User sends `PATCH /users/me` with `{ "accountStatus": "active", "kycStatus": "approved" }`. If ValidationPipe `whitelist: true` doesn't strip these fields (depends on DTO decorators), the user could self-activate or self-approve KYC. |
| **Affected Component(s)** | `users.service.ts` (line 23), `UpdateUserDto` |
| **Likelihood** | 3 — Possible (depends on DTO configuration) |
| **Impact** | 4 — Major |
| **Risk Score** | **12** |
| **Risk Level** | **High** |
| **Business Impact** | Privilege escalation — user bypasses KYC, reactivates suspended account, or changes account type. |
| **Detection Strategy** | Submit PATCH with restricted fields (accountStatus, kycStatus). Verify they are rejected or ignored. |
| **Testing Strategy** | Attempt to update accountStatus, kycStatus, accountType, email, passwordHash via PATCH. Verify whitelist enforcement. |
| **Mitigation / Control** | `whitelist: true` in ValidationPipe should strip undecorated fields. Requires DTO inspection and testing. |
| **Status** | Open — Requires DTO validation testing |

---

### 5.5 Database / ACID Risks

---

#### RISK-021 — TypeORM `synchronize: true` in Production

| Field | Value |
|---|---|
| **Risk ID** | RISK-021 |
| **Category** | Database / ACID |
| **Risk Description** | `app.module.ts` (line 37) sets `synchronize: true` for TypeORM. This auto-applies schema changes on application startup in any environment, including production. |
| **Failure Scenario** | An entity change in code (e.g., column type modification) causes TypeORM to alter production database schema on deployment, potentially dropping columns, losing data, or causing downtime. |
| **Affected Component(s)** | `app.module.ts` (line 37), all entity files |
| **Likelihood** | 3 — Possible |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **15** |
| **Risk Level** | **High** |
| **Business Impact** | Unintended production database schema changes. Potential data loss, financial record corruption. |
| **Detection Strategy** | Verify `synchronize` configuration in production deployment. Monitor schema changes on application restart. |
| **Testing Strategy** | Verify that entity changes do not auto-apply in production. Test migration workflow. |
| **Mitigation / Control** | Set `synchronize: false` in production. Use TypeORM migrations for schema changes. |
| **Status** | Open — Confirmed finding |

---

#### RISK-022 — No Database CHECK Constraint on Wallet Balance

| Field | Value |
|---|---|
| **Risk ID** | RISK-022 |
| **Category** | Database / ACID |
| **Risk Description** | The `wallet.entity.ts` defines balance as `decimal(12,2)` with default 0, but no database-level CHECK constraint prevents negative balances. Balance validation occurs only in application code. |
| **Failure Scenario** | A bug in application code, a direct database operation, or a race condition could set balance below zero. PostgreSQL would not reject this. |
| **Affected Component(s)** | `wallet.entity.ts` (line 26), PostgreSQL schema |
| **Likelihood** | 2 — Unlikely (application validation exists) |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **10** |
| **Risk Level** | **High** |
| **Business Impact** | Negative wallet balance — money created from nothing. Financial integrity violation. |
| **Detection Strategy** | Inspect database schema for CHECK constraints. Attempt to set balance below zero via API edge cases. |
| **Testing Strategy** | Database schema inspection. Test transfers that should result in exactly zero balance. Test concurrent transfers that together exceed balance. |
| **Mitigation / Control** | Add `CHECK (balance >= 0)` constraint to wallets table. |
| **Status** | Open — Requires schema inspection |

---

#### RISK-023 — Transaction Record Partial Commit Risk

| Field | Value |
|---|---|
| **Risk ID** | RISK-023 |
| **Category** | Database / ACID |
| **Risk Description** | The transfer transaction in `transfers.service.ts` (lines 80–184) correctly uses a QueryRunner with manual transaction management. The rollback logic (line 177–179) checks `isTransactionActive` before rolling back. This must be verified under error conditions. |
| **Failure Scenario** | Exception occurs between wallet debit (line 152) and transaction record creation (line 172). If rollback fails or is skipped, wallet is debited without a corresponding transaction record. |
| **Affected Component(s)** | `transfers.service.ts` (lines 80–184), PostgreSQL |
| **Likelihood** | 1 — Rare |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **5** |
| **Risk Level** | **Medium** |
| **Business Impact** | Wallet debited without transaction record — untracked financial operation. |
| **Detection Strategy** | Force exceptions at various points within the transaction. Verify rollback completeness. |
| **Testing Strategy** | Integration tests simulating failures at each step within the transaction. Verify wallet balance and transaction records after rollback. |
| **Mitigation / Control** | Transaction management is implemented. Requires verification under failure injection. |
| **Status** | Open — Requires integration testing |

---

#### RISK-024 — Seed Script with TRUNCATE CASCADE and Hardcoded Credentials

| Field | Value |
|---|---|
| **Risk ID** | RISK-024 |
| **Category** | Database / ACID |
| **Risk Description** | `database/seed/seed.ts` contains `TRUNCATE TABLE ... CASCADE` (line 51–53) which destroys all data. The script also contains hardcoded password `Password123!` (line 55) and a default database URL with `postgres:password` credentials (line 32). |
| **Failure Scenario** | Seed script accidentally executed against production database, destroying all user data, wallets, and transaction history. |
| **Affected Component(s)** | `database/seed/seed.ts` (lines 32, 51–53, 55) |
| **Likelihood** | 2 — Unlikely |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **10** |
| **Risk Level** | **High** |
| **Business Impact** | Complete production data loss. All user accounts, wallet balances, and transaction history destroyed. |
| **Detection Strategy** | Verify seed script has environment guards. Verify production database URL differs from seed defaults. |
| **Testing Strategy** | Verify seed script cannot execute against production. Test environment variable isolation. |
| **Mitigation / Control** | Add explicit production environment check at seed script entry point. Remove hardcoded credentials. |
| **Status** | Open — Confirmed finding |

---

### 5.6 Redis / Idempotency Risks

---

#### RISK-025 — Idempotency Key TTL Allows Replay After Expiry

| Field | Value |
|---|---|
| **Risk ID** | RISK-025 |
| **Category** | Redis / Idempotency |
| **Risk Description** | Idempotency keys expire after `IDEMPOTENCY_TTL_SECONDS` (default 86400 = 24 hours, line 31 of `idempotency.service.ts`). After expiry, the same idempotency key can be reused, potentially creating a duplicate transfer. |
| **Failure Scenario** | Client sends a transfer with idempotency key `X`. Transfer completes. After 24 hours, key expires. Client retries with the same key `X` — a new transfer is created. |
| **Affected Component(s)** | `idempotency.service.ts` (line 31), Redis TTL |
| **Likelihood** | 2 — Unlikely |
| **Impact** | 4 — Major |
| **Risk Score** | **8** |
| **Risk Level** | **Medium** |
| **Business Impact** | Duplicate transfer after TTL expiry. |
| **Detection Strategy** | Test idempotency key behavior before and after TTL expiry. |
| **Testing Strategy** | Submit transfer, wait for TTL expiry (or configure short TTL), resubmit with same key. Verify behavior. |
| **Mitigation / Control** | TTL is set to 24 hours which is reasonable. Document behavior for clients. Consider database-level idempotency as secondary check. |
| **Status** | Open — Requires TTL behavior testing |

---

#### RISK-026 — Redis Unavailability Blocks All Transfers

| Field | Value |
|---|---|
| **Risk ID** | RISK-026 |
| **Category** | Redis / Idempotency |
| **Risk Description** | The idempotency check is mandatory for all transfers (`SET NX` in Redis). If Redis is completely unavailable, the `SET NX` call will throw an error, preventing all transfers. |
| **Failure Scenario** | Redis outage → all transfer API calls fail → users cannot send money. |
| **Affected Component(s)** | `idempotency.service.ts`, `redis.service.ts`, `transfers.service.ts` |
| **Likelihood** | 2 — Unlikely |
| **Impact** | 4 — Major |
| **Risk Score** | **8** |
| **Risk Level** | **Medium** |
| **Business Impact** | Complete transfer functionality outage during Redis unavailability. |
| **Detection Strategy** | Simulate Redis unavailability. Attempt transfers. Verify error handling and user messaging. |
| **Testing Strategy** | Test transfer endpoint with Redis down. Verify graceful error response. Verify no partial state in PostgreSQL. |
| **Mitigation / Control** | Consider fallback behavior when Redis is unavailable (e.g., database-based idempotency). |
| **Status** | Open — Requires resilience testing |

---

#### RISK-027 — Idempotency Processing Lock TTL (60 seconds) May Be Too Short

| Field | Value |
|---|---|
| **Risk ID** | RISK-027 |
| **Category** | Redis / Idempotency |
| **Risk Description** | The initial idempotency record is stored with `lockTtlSeconds = 60` (line 24 of `idempotency.service.ts`). If the transfer transaction takes longer than 60 seconds (e.g., under database contention), the lock expires and a duplicate request could begin processing. |
| **Failure Scenario** | Transfer A starts, acquires idempotency lock. Database is under heavy load, transaction takes 61+ seconds. Lock expires. Transfer B with same idempotency key starts processing. Both transfers execute. |
| **Affected Component(s)** | `idempotency.service.ts` (line 24, 72–78) |
| **Likelihood** | 1 — Rare |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **5** |
| **Risk Level** | **Medium** |
| **Business Impact** | Duplicate financial operation due to expired processing lock. |
| **Detection Strategy** | Test with artificially slow database operations exceeding 60 seconds. Verify lock behavior. |
| **Testing Strategy** | Simulate slow transaction under load. Verify lock holds or extends. Test concurrent duplicate requests during slow processing. |
| **Mitigation / Control** | PostgreSQL pessimistic lock provides secondary protection. Consider lock extension during processing. |
| **Status** | Open — Requires load testing |

---

### 5.7 BullMQ / Async Processing Risks

---

#### RISK-028 — BullMQ Job Stuck in Active State After Worker Crash

| Field | Value |
|---|---|
| **Risk ID** | RISK-028 |
| **Category** | BullMQ / Async Processing |
| **Risk Description** | If the BullMQ worker process crashes during transfer processing, the job may remain in "active" state. The transaction status would be PROCESSING but never transition to COMPLETED or FAILED. |
| **Failure Scenario** | Worker crashes after transitioning transaction to PROCESSING (line 74–93 of `transfers.processor.ts`). Job remains active until BullMQ's `stalledInterval` detects it. Transaction stays PROCESSING indefinitely if stalled job detection is not configured. |
| **Affected Component(s)** | `transfers.processor.ts`, BullMQ worker configuration |
| **Likelihood** | 2 — Unlikely |
| **Impact** | 4 — Major |
| **Risk Score** | **8** |
| **Risk Level** | **Medium** |
| **Business Impact** | Transaction stuck in PROCESSING. User sees perpetual "Processing" state. Wallet already debited. |
| **Detection Strategy** | Kill worker process during active job. Verify stalled job detection and retry. |
| **Testing Strategy** | Simulate worker crash during processing. Verify stalled job recovery. Verify transaction reaches terminal state. |
| **Mitigation / Control** | BullMQ has built-in stalled job detection. Verify configuration (stalledInterval, maxStalledCount). |
| **Status** | Open — Requires worker failure testing |

---

#### RISK-029 — BullMQ Retry Creates Duplicate Financial Side Effects

| Field | Value |
|---|---|
| **Risk ID** | RISK-029 |
| **Category** | BullMQ / Async Processing |
| **Risk Description** | Jobs are configured with `attempts: 3` and exponential backoff. The processor has idempotent status checks (lines 52–71), but the `processTransfer` method (line 139–147) is a simulated settlement — if real settlement logic had side effects, retries could duplicate them. |
| **Failure Scenario** | Job partially processes (external API called), then fails. Retry re-executes the processor. If the status transition check (PENDING → PROCESSING) succeeds due to timing, the settlement could execute twice. |
| **Affected Component(s)** | `transfers.processor.ts` (lines 25–133) |
| **Likelihood** | 2 — Unlikely (status check provides protection) |
| **Impact** | 4 — Major |
| **Risk Score** | **8** |
| **Risk Level** | **Medium** |
| **Business Impact** | Duplicate settlement execution. In current implementation, impact is low (simulated), but risk increases with real payment integration. |
| **Detection Strategy** | Force job failure after partial processing. Verify retry behavior and idempotency. |
| **Testing Strategy** | Test job retry behavior with SIMULATE_FAILURE. Verify transaction reaches correct terminal state. Verify no duplicate side effects. |
| **Mitigation / Control** | Atomic conditional update (`UPDATE ... WHERE status = 'PENDING'`) provides protection. Verify under test conditions. |
| **Status** | Open — Requires integration testing |

---

### 5.8 Frontend Risks

---

#### RISK-030 — JWT Stored in localStorage (XSS Vulnerability)

| Field | Value |
|---|---|
| **Risk ID** | RISK-030 |
| **Category** | Frontend / Security |
| **Risk Description** | JWT access token is stored in `localStorage` via `setStoredToken()` in `api.ts` (lines 17–23). localStorage is accessible to any JavaScript running on the same origin, including XSS payloads. |
| **Failure Scenario** | XSS vulnerability in the application allows attacker to execute `localStorage.getItem('wrightpay_access_token')` and steal the JWT. Attacker uses the token to access the victim's account. |
| **Affected Component(s)** | `frontend/lib/api.ts` (lines 6–33), `frontend/lib/auth-context.tsx` |
| **Likelihood** | 3 — Possible |
| **Impact** | 4 — Major |
| **Risk Score** | **12** |
| **Risk Level** | **High** |
| **Business Impact** | Session hijacking. Attacker gains full access to victim's account including financial operations. |
| **Detection Strategy** | Verify token storage mechanism. Test for XSS vulnerabilities that could extract the token. |
| **Testing Strategy** | Verify localStorage contains JWT after login. Test XSS injection points. Verify token exposure. |
| **Mitigation / Control** | Consider httpOnly cookie-based session management. Implement Content Security Policy. Sanitize all user inputs. |
| **Status** | Open — Confirmed finding |

---

#### RISK-031 — Stale Wallet Balance Displayed After Transfer

| Field | Value |
|---|---|
| **Risk ID** | RISK-031 |
| **Category** | Frontend |
| **Risk Description** | After a transfer completes, the wallet balance is refreshed via a separate `getMyWallet()` call (line 136 of `send-money/page.tsx`). If the refresh fails or the transfer status polling stops before COMPLETED, the displayed balance may be stale. |
| **Failure Scenario** | Transfer completes. Wallet refresh API call fails silently. User sees pre-transfer balance on dashboard. |
| **Affected Component(s)** | `frontend/app/dashboard/send-money/page.tsx` (lines 122–143), `frontend/lib/api/wallets.ts` |
| **Likelihood** | 3 — Possible |
| **Impact** | 2 — Minor |
| **Risk Score** | **6** |
| **Risk Level** | **Medium** |
| **Business Impact** | User confusion — displayed balance doesn't match actual balance. Could lead to unintended overdraft attempt. |
| **Detection Strategy** | Complete a transfer. Verify wallet balance updates on dashboard. Simulate wallet API failure after transfer. |
| **Testing Strategy** | E2E test: transfer → verify dashboard balance update. Test with API failure during refresh. |
| **Mitigation / Control** | Add error handling for wallet refresh. Show "balance may be outdated" warning on refresh failure. |
| **Status** | Open |

---

#### RISK-032 — Transaction Status Polling Stops After 20 Attempts

| Field | Value |
|---|---|
| **Risk ID** | RISK-032 |
| **Category** | Frontend |
| **Risk Description** | Transaction status polling in `send-money/page.tsx` (lines 122–143) runs at 1.5-second intervals and stops after 20 attempts (30 seconds). If BullMQ processing takes longer, the UI stops updating. |
| **Failure Scenario** | Transfer is submitted. BullMQ worker is slow or backed up. After 30 seconds, polling stops. User sees PENDING/PROCESSING status with no further updates. |
| **Affected Component(s)** | `frontend/app/dashboard/send-money/page.tsx` (lines 127–143) |
| **Likelihood** | 3 — Possible |
| **Impact** | 2 — Minor |
| **Risk Score** | **6** |
| **Risk Level** | **Medium** |
| **Business Impact** | User uncertainty about transfer status. May attempt duplicate transfer. |
| **Detection Strategy** | Delay BullMQ processing beyond 30 seconds. Observe polling behavior. |
| **Testing Strategy** | Test with slow worker. Verify polling timeout behavior. Verify user can check status via transactions page. |
| **Mitigation / Control** | Show "processing is taking longer than expected" message after polling stops. Link to transactions page. |
| **Status** | Open |

---

### 5.9 Security Risks

---

#### RISK-033 — No Rate Limiting on Transfer Endpoint

| Field | Value |
|---|---|
| **Risk ID** | RISK-033 |
| **Category** | Security |
| **Risk Description** | No rate limiting on `POST /transfers`. Combined with no server-wide throttling (RISK-008), a malicious actor could flood the transfer endpoint with requests. |
| **Failure Scenario** | Attacker with valid credentials submits thousands of transfer requests per minute, overwhelming database connections, Redis, and BullMQ. |
| **Affected Component(s)** | `transfers.controller.ts`, all API endpoints |
| **Likelihood** | 4 — Likely |
| **Impact** | 4 — Major |
| **Risk Score** | **16** |
| **Risk Level** | **High** |
| **Business Impact** | Denial of service. Resource exhaustion. Potential financial abuse through mass transfer attempts. |
| **Detection Strategy** | Send high-volume transfer requests. Verify no throttling. |
| **Testing Strategy** | Load test transfer endpoint. Verify system behavior under high request volume. |
| **Mitigation / Control** | Implement rate limiting on all endpoints, with stricter limits on financial and authentication endpoints. |
| **Status** | Open — Confirmed finding |

---

#### RISK-034 — Broad CORS Regex Allows Any Vercel Subdomain

| Field | Value |
|---|---|
| **Risk ID** | RISK-034 |
| **Category** | Security |
| **Risk Description** | CORS configuration in `main.ts` (line 21) allows `^https:\/\/.*\.vercel\.app$`. Any application hosted on any Vercel subdomain (including attacker-controlled) can make credentialed API requests. |
| **Failure Scenario** | Attacker hosts a malicious page on `evil-site.vercel.app`. If a WrightPay user visits it while logged in (and if cookies were used), the attacker could make cross-origin API requests. With localStorage tokens, CORS is less exploitable but still a security misconfiguration. |
| **Affected Component(s)** | `main.ts` (line 21) |
| **Likelihood** | 2 — Unlikely (tokens in localStorage not sent by default cross-origin) |
| **Impact** | 3 — Moderate |
| **Risk Score** | **6** |
| **Risk Level** | **Medium** |
| **Business Impact** | Potential cross-origin attack vector. Weakens defense-in-depth. |
| **Detection Strategy** | Verify CORS headers with requests from arbitrary vercel.app subdomains. |
| **Testing Strategy** | Send API requests with `Origin: https://malicious.vercel.app`. Verify CORS headers. |
| **Mitigation / Control** | Restrict to specific WrightPay frontend deployment URL rather than wildcard. |
| **Status** | Open — Confirmed finding |

---

#### RISK-035 — No Password Complexity Enforcement Beyond MinLength(8)

| Field | Value |
|---|---|
| **Risk ID** | RISK-035 |
| **Category** | Security |
| **Risk Description** | Signup DTO in `signup.dto.ts` only requires `@MinLength(8)`. No uppercase, lowercase, digit, or special character requirements enforced. |
| **Failure Scenario** | Users create weak passwords like `aaaaaaaa` or `12345678`. Combined with no rate limiting, accounts are easily brute-forced. |
| **Affected Component(s)** | `auth/dto/signup.dto.ts` (lines 20–22) |
| **Likelihood** | 4 — Likely |
| **Impact** | 3 — Moderate |
| **Risk Score** | **12** |
| **Risk Level** | **High** |
| **Business Impact** | Weak passwords increase credential compromise risk. |
| **Detection Strategy** | Attempt signup with weak passwords (all lowercase, all digits, common passwords). Verify acceptance. |
| **Testing Strategy** | Test password validation with weak, common, and strong passwords. |
| **Mitigation / Control** | Add `@Matches()` regex decorator requiring uppercase, lowercase, digit, and special character. |
| **Status** | Open — Confirmed finding |

---

#### RISK-036 — SQL Injection via Transaction Search (ILIKE)

| Field | Value |
|---|---|
| **Risk ID** | RISK-036 |
| **Category** | Security |
| **Risk Description** | The transaction search in `transactions.service.ts` (lines 76–79) uses TypeORM query builder with parameterized `ILIKE :ref`. While TypeORM parameterizes values (mitigating standard SQL injection), the use of `%${dto.reference.trim()}%` should be verified. |
| **Failure Scenario** | Attacker submits `reference` query parameter with SQL metacharacters. TypeORM should parameterize correctly, but special LIKE wildcards (`%`, `_`) may affect query behavior. |
| **Affected Component(s)** | `transactions.service.ts` (lines 76–79) |
| **Likelihood** | 1 — Rare (TypeORM parameterizes) |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **5** |
| **Risk Level** | **Medium** |
| **Business Impact** | Potential data breach if SQL injection is successful. |
| **Detection Strategy** | Submit SQL injection payloads in reference query parameter. Verify parameterization. |
| **Testing Strategy** | SQL injection testing on all user-controlled query parameters. Verify TypeORM parameterization. |
| **Mitigation / Control** | TypeORM uses parameterized queries. Escape LIKE wildcards in user input. |
| **Status** | Open — Requires injection testing |

---

### 5.10 Infrastructure Risks

---

#### RISK-037 — test_db.ts Contains Hardcoded Database Credentials

| Field | Value |
|---|---|
| **Risk ID** | RISK-037 |
| **Category** | Infrastructure |
| **Risk Description** | Root-level `test_db.ts` (line 12) contains hardcoded local database credentials: `postgresql://postgres:postgres@localhost:5432/wrightpay_db`. While these are local dev credentials, the file is committed to the repository. |
| **Failure Scenario** | If these credentials match any shared or staging environment, unauthorized database access is possible. |
| **Affected Component(s)** | `test_db.ts` (line 12) |
| **Likelihood** | 1 — Rare |
| **Impact** | 3 — Moderate |
| **Risk Score** | **3** |
| **Risk Level** | **Low** |
| **Business Impact** | Credential exposure. Local-only risk unless credentials are reused. |
| **Detection Strategy** | Verify credentials don't match non-local environments. |
| **Testing Strategy** | Review committed credentials. Verify they are strictly local. |
| **Mitigation / Control** | Move to environment variables. Add to .gitignore or remove file. |
| **Status** | Open — Low priority |

---

#### RISK-038 — SSL Configuration Uses rejectUnauthorized: false

| Field | Value |
|---|---|
| **Risk ID** | RISK-038 |
| **Category** | Infrastructure |
| **Risk Description** | Both PostgreSQL SSL (`app.module.ts` line 38) and Redis TLS (`redis.service.ts` line 15, `app.module.ts` line 52) use `rejectUnauthorized: false`, disabling certificate validation. |
| **Failure Scenario** | Man-in-the-middle attack between backend and database/Redis. Attacker intercepts database queries or Redis commands containing financial data. |
| **Affected Component(s)** | `app.module.ts` (lines 38, 52), `redis.service.ts` (line 15) |
| **Likelihood** | 1 — Rare (requires network-level access) |
| **Impact** | 5 — Severe/Catastrophic |
| **Risk Score** | **5** |
| **Risk Level** | **Medium** |
| **Business Impact** | Interception of database queries containing financial data, credentials, and user PII. |
| **Detection Strategy** | Review TLS configuration. Verify certificate validation in production. |
| **Testing Strategy** | Verify SSL/TLS connection security in production environment. |
| **Mitigation / Control** | Enable `rejectUnauthorized: true` in production with proper CA certificates. |
| **Status** | Open — Requires production configuration review |

---

### 5.11 Reliability / Recovery Risks

---

#### RISK-039 — No Health Check Endpoint for Load Balancer/Orchestrator

| Field | Value |
|---|---|
| **Risk ID** | RISK-039 |
| **Category** | Reliability / Recovery |
| **Risk Description** | `app.controller.ts` provides a basic root endpoint, but no dedicated health check that verifies database, Redis, and BullMQ connectivity. A shallow health check may report "healthy" while critical dependencies are down. |
| **Failure Scenario** | Database is unreachable but the application process is running. Health check returns 200. Load balancer continues routing traffic. All API calls fail with database errors. |
| **Affected Component(s)** | `app.controller.ts`, Render deployment |
| **Likelihood** | 3 — Possible |
| **Impact** | 3 — Moderate |
| **Risk Score** | **9** |
| **Risk Level** | **Medium** |
| **Business Impact** | Traffic routed to unhealthy instance. Users experience errors despite "healthy" application. |
| **Detection Strategy** | Check health endpoint response. Verify it validates database/Redis connectivity. |
| **Testing Strategy** | Test health endpoint with healthy and unhealthy dependencies. Verify response accuracy. |
| **Mitigation / Control** | Implement deep health check verifying PostgreSQL, Redis, and BullMQ connectivity. |
| **Status** | Open — Requires verification |

---

#### RISK-040 — No Graceful Shutdown for BullMQ Worker

| Field | Value |
|---|---|
| **Risk ID** | RISK-040 |
| **Category** | Reliability / Recovery |
| **Risk Description** | No explicit graceful shutdown handler observed for the BullMQ worker. During deployment restarts, active jobs may be interrupted mid-processing. |
| **Failure Scenario** | Render restarts the backend during a deployment. Worker is processing a transfer job. Job is interrupted. Transaction may be left in PROCESSING state. |
| **Affected Component(s)** | `transfers.processor.ts`, NestJS application lifecycle |
| **Likelihood** | 3 — Possible |
| **Impact** | 3 — Moderate |
| **Risk Score** | **9** |
| **Risk Level** | **Medium** |
| **Business Impact** | Interrupted transfer processing. Transaction stuck in PROCESSING. Requires manual intervention or stalled job detection. |
| **Detection Strategy** | Deploy during active transfer processing. Verify job completion after restart. |
| **Testing Strategy** | Test deployment restart during active BullMQ processing. Verify transaction reaches terminal state. |
| **Mitigation / Control** | Implement NestJS `OnModuleDestroy` to gracefully close BullMQ worker. Wait for active jobs to complete. |
| **Status** | Open — Requires deployment testing |

---

### 5.12 Performance / Concurrency Risks

---

#### RISK-041 — Exchange Rate Calculation Requires Multiple Database Queries

| Field | Value |
|---|---|
| **Risk ID** | RISK-041 |
| **Category** | Performance / Concurrency |
| **Risk Description** | `exchange-rates.service.ts` may execute up to 4 sequential database queries per rate lookup (direct rate, inverse rate, triangular EUR→from, triangular EUR→to). During a transfer, this adds to the time the pessimistic lock is held. |
| **Failure Scenario** | Under high transfer volume, multiple database queries within the locked transaction increase lock hold time, causing contention and degraded throughput. |
| **Affected Component(s)** | `exchange-rates.service.ts` (lines 20–68), `transfers.service.ts` (lines 130–133) |
| **Likelihood** | 3 — Possible |
| **Impact** | 2 — Minor |
| **Risk Score** | **6** |
| **Risk Level** | **Medium** |
| **Business Impact** | Degraded transfer performance under load. Increased lock contention. |
| **Detection Strategy** | Profile transfer execution time. Measure exchange rate query latency. |
| **Testing Strategy** | Performance testing: measure transfer latency with various currency pairs. Load test concurrent transfers. |
| **Mitigation / Control** | Consider caching exchange rates in Redis. Pre-compute inverse/triangular rates. |
| **Status** | Open — Requires performance testing |

---

#### RISK-042 — No Database Connection Pool Configuration

| Field | Value |
|---|---|
| **Risk ID** | RISK-042 |
| **Category** | Performance / Concurrency |
| **Risk Description** | TypeORM configuration in `app.module.ts` does not explicitly set connection pool parameters (`poolSize`, `extra.max`, etc.). Default TypeORM pool size may be insufficient under production load. |
| **Failure Scenario** | Under concurrent user load, database connection pool is exhausted. API requests wait for connections or fail with timeout errors. |
| **Affected Component(s)** | `app.module.ts` (lines 24–42), PostgreSQL |
| **Likelihood** | 3 — Possible |
| **Impact** | 3 — Moderate |
| **Risk Score** | **9** |
| **Risk Level** | **Medium** |
| **Business Impact** | API degradation under load. Transfer failures due to connection exhaustion. |
| **Detection Strategy** | Load test with concurrent users. Monitor database connection count. |
| **Testing Strategy** | Performance testing with concurrent API requests. Monitor connection pool behavior. |
| **Mitigation / Control** | Configure explicit pool size based on expected load and database limits. |
| **Status** | Open — Requires load testing |

---

### 5.13 Observability Risks

---

#### RISK-043 — BullMQ Enqueue Failure Logged but Not Alerted

| Field | Value |
|---|---|
| **Risk ID** | RISK-043 |
| **Category** | Observability |
| **Risk Description** | When BullMQ job enqueue fails (`transfers.service.ts` lines 206–211), the error is logged but the API returns success. No alerting mechanism to notify operations of a failed enqueue (which means a debited transfer will never process). |
| **Failure Scenario** | Enqueue failure occurs. Log message is written. No alert fires. No one notices. Transaction stays PENDING indefinitely. User's money is stuck. |
| **Affected Component(s)** | `transfers.service.ts` (lines 206–211) |
| **Likelihood** | 3 — Possible |
| **Impact** | 4 — Major |
| **Risk Score** | **12** |
| **Risk Level** | **High** |
| **Business Impact** | Financial operation silently fails. No operational visibility into stuck transfers. |
| **Detection Strategy** | Verify logging output for enqueue failures. Check monitoring/alerting configuration. |
| **Testing Strategy** | Simulate enqueue failure. Verify log output includes sufficient context for debugging. Test whether alerts are generated. |
| **Mitigation / Control** | Add structured error logging. Implement monitoring for PENDING transactions exceeding age threshold. |
| **Status** | Open — Requires observability review |

---

#### RISK-044 — No Structured Logging Format

| Field | Value |
|---|---|
| **Risk ID** | RISK-044 |
| **Category** | Observability |
| **Risk Description** | The application uses NestJS `Logger` with default text format. No structured JSON logging observed. In production, text logs are harder to parse, search, and aggregate. |
| **Failure Scenario** | Production incident requires log analysis. Text-format logs are difficult to search and correlate across services. |
| **Affected Component(s)** | All services using `Logger` class |
| **Likelihood** | 4 — Likely |
| **Impact** | 2 — Minor |
| **Risk Score** | **8** |
| **Risk Level** | **Medium** |
| **Business Impact** | Slower incident response. Reduced operational visibility. |
| **Detection Strategy** | Review log format in production deployment. |
| **Testing Strategy** | Verify log format. Check for structured fields (timestamp, level, correlation ID, userId). |
| **Mitigation / Control** | Implement structured JSON logging with correlation IDs. |
| **Status** | Open |

---

#### RISK-045 — Error Responses May Leak Internal Details

| Field | Value |
|---|---|
| **Risk ID** | RISK-045 |
| **Category** | Observability / Security |
| **Risk Description** | The transfer service includes detailed error information in some error messages (e.g., wallet balance, required amount in `transfers.service.ts` line 143). While informative for users, excessive detail in error responses could aid attackers. |
| **Failure Scenario** | Error message reveals wallet balance amount to a potential attacker probing the API: `"Insufficient wallet balance. Required: 125.00 EUR (Amount: 100 + Fee: 25), Available: 50.00 EUR"`. |
| **Affected Component(s)** | `transfers.service.ts` (line 142–144) |
| **Likelihood** | 3 — Possible |
| **Impact** | 2 — Minor |
| **Risk Score** | **6** |
| **Risk Level** | **Medium** |
| **Business Impact** | Information disclosure — wallet balance exposed in error messages. |
| **Detection Strategy** | Submit transfers with insufficient balance. Examine error response for sensitive data. |
| **Testing Strategy** | Review all error responses for sensitive data exposure. Verify balance information is appropriately protected. |
| **Mitigation / Control** | Return generic "Insufficient balance" message. Provide detailed balance info only in authenticated dashboard context. |
| **Status** | Open |

---

## 6. Risk Summary

### 6.1 Risk Distribution

| Risk Level    | Count | Percentage |
|---------------|-------|------------|
| **Critical**  | 2     | 4.4%       |
| **High**      | 16    | 35.6%      |
| **Medium**    | 24    | 53.3%      |
| **Low**       | 3     | 6.7%       |
| **Total**     | **45**| 100%       |

### 6.2 Category Distribution

| Category                       | Count | Critical | High | Medium | Low |
|--------------------------------|-------|----------|------|--------|-----|
| Financial                      | 7     | 0        | 3    | 4      | 0   |
| Authentication                 | 5     | 2        | 3    | 0      | 0   |
| Authorization / Multi-Tenancy  | 4     | 0        | 1    | 3      | 0   |
| API                            | 4     | 0        | 3    | 1      | 0   |
| Database / ACID                | 4     | 0        | 3    | 1      | 0   |
| Redis / Idempotency            | 3     | 0        | 0    | 3      | 0   |
| BullMQ / Async Processing      | 2     | 0        | 0    | 2      | 0   |
| Frontend                       | 3     | 0        | 1    | 2      | 0   |
| Security                       | 4     | 0        | 2    | 2      | 0   |
| Infrastructure                 | 2     | 0        | 0    | 1      | 1   |
| Reliability / Recovery         | 2     | 0        | 0    | 2      | 0   |
| Performance / Concurrency      | 2     | 0        | 0    | 2      | 0   |
| Observability                  | 3     | 0        | 1    | 2      | 0   |

---

## 7. Top Critical Risks

The following risks pose the greatest threat to WrightPay and receive the **highest testing priority**:

### 7.1 RISK-008 — No Rate Limiting on Authentication Endpoints (Score: 20, Critical)

**Why this is the #1 priority:** Every authentication endpoint (login, signup, verify-email) is completely unprotected against automated attacks. This is not a theoretical risk — the absence of `ThrottlerGuard` is confirmed throughout the entire codebase. Combined with the OTP brute-force vulnerability (RISK-010), an attacker can compromise any account in minutes.

### 7.2 RISK-010 — No OTP Attempt Lockout (Score: 20, Critical)

**Why this is critical:** With only 900,000 possible 6-digit OTPs, no attempt lockout, and no rate limiting, OTP brute-force is trivially achievable. A 15-minute expiry window (observed in code) combined with no throttling allows approximately 50,000+ attempts per minute via scripted HTTP requests. An attacker can verify any email and activate any account.

### 7.3 RISK-001 — BullMQ Enqueue Failure After Wallet Debit (Score: 15, High)

**Why this is critical for testing:** The code explicitly catches and swallows the enqueue error (lines 206–211 of `transfers.service.ts`). The API returns success. The user sees a confirmed transfer. But the wallet is debited and the money is stuck — the BullMQ job was never created, so the processor never runs, and the transfer never completes. This is a **money loss scenario** with no automated recovery.

### 7.4 RISK-005 — Transfer Marked FAILED but Balance Not Restored (Score: 15, High)

**Why this is critical for testing:** After all retry attempts are exhausted, the processor marks the transaction as FAILED. However, the wallet was debited during the initial PostgreSQL transaction (which committed successfully). No compensating credit is observed in the failure handler. This is a second **money loss scenario**.

### 7.5 RISK-021 — TypeORM `synchronize: true` in Production (Score: 15, High)

**Why this is critical for testing:** This configuration is a well-known production anti-pattern. Any entity change in code will automatically modify the production database schema on the next deployment. This could drop columns, alter types, or lose data without warning.

---

## 8. Risk-Based Testing Priority

### P0 — Critical Priority (Immediate, Maximum Depth)

| Risk IDs | Testing Depth |
|---|---|
| RISK-008, RISK-010 (Auth rate limiting & OTP brute-force) | Security testing, brute-force simulation, penetration testing |
| RISK-001, RISK-005 (Financial money loss scenarios) | Integration testing, failure injection, database verification, recovery testing |
| RISK-002, RISK-003 (Concurrent transfers, duplicate processing) | Concurrency testing, database locking verification, Redis failure simulation |
| RISK-016 (Cross-user wallet/beneficiary in transfers) | IDOR/BOLA testing across all transfer parameters |

**P0 tests require:** Unit tests, integration tests, API tests, database tests, concurrency tests, security tests, E2E tests, negative tests, recovery tests, and production-safe smoke tests.

### P1 — High Priority (Deep, Multi-Layer Testing)

| Risk IDs | Testing Depth |
|---|---|
| RISK-009, RISK-011, RISK-012 (OTP security, JWT revocation, dev OTP) | Authentication testing, security testing, environment validation |
| RISK-020 (Profile update privilege escalation) | API testing, DTO validation testing, authorization testing |
| RISK-021 (synchronize: true) | Infrastructure/configuration testing, deployment verification |
| RISK-022 (No CHECK constraint on balance) | Database schema testing, boundary testing |
| RISK-024 (Seed script risk) | Infrastructure testing, environment isolation |
| RISK-030 (JWT in localStorage) | XSS testing, security testing, frontend security audit |
| RISK-033 (No rate limiting on transfers) | Load testing, security testing, abuse simulation |
| RISK-035 (Weak password policy) | Validation testing, security testing |
| RISK-043 (Silent enqueue failure) | Observability testing, monitoring verification |

**P1 tests require:** API tests, security tests, integration tests, database tests, and selected E2E tests.

### P2 — Medium Priority (Standard Coverage)

| Risk IDs | Testing Depth |
|---|---|
| RISK-004, RISK-006, RISK-007 (Financial precision, fee config, rate staleness) | Boundary testing, API contract testing, data integrity testing |
| RISK-013, RISK-014, RISK-015 (IDOR on transactions, cards, beneficiaries) | Authorization testing, API testing |
| RISK-017, RISK-018, RISK-019 (Public endpoints, Swagger, max amount) | API testing, security testing |
| RISK-023 (Partial commit) | Integration testing, ACID testing |
| RISK-025, RISK-026, RISK-027 (Redis TTL, unavailability, lock timeout) | Resilience testing, integration testing |
| RISK-028, RISK-029 (BullMQ stalled jobs, retry duplicates) | Async processing testing, integration testing |
| RISK-031, RISK-032 (Stale balance, polling timeout) | E2E testing, frontend testing |
| RISK-034, RISK-036 (CORS, SQL injection) | Security testing |
| RISK-038, RISK-039, RISK-040 (SSL, health check, graceful shutdown) | Infrastructure testing, reliability testing |
| RISK-041, RISK-042 (Exchange rate perf, connection pool) | Performance testing |
| RISK-044, RISK-045 (Logging, error info disclosure) | Observability testing, security testing |

**P2 tests require:** API tests, integration tests, and selected manual/exploratory testing.

### P3 — Low Priority (Basic Verification)

| Risk IDs | Testing Depth |
|---|---|
| RISK-037 (test_db credentials) | Code review, .gitignore verification |

**P3 tests require:** Code review and configuration verification.

---

## 9. Risk → Testing Level / Testing Type Traceability

This section maps major risks to the testing levels and testing types documented in `qa/WrightPay_Master_Test_Strategy.md` (Sections 6 and 7).

### Financial Risks

| Risk | Testing Levels | Testing Types |
|---|---|---|
| **RISK-001** BullMQ Enqueue Failure | Integration, API, Infrastructure/Async | Financial Integrity (§7.15), Reliability/Failure (§7.19), Recovery (§7.20), Data Integrity (§7.16) |
| **RISK-002** Concurrent Transfer Race | Integration, API, Database | Concurrency (§7.18), Financial Integrity (§7.15), Transaction/ACID (§7.17), Database (§6.4) |
| **RISK-003** Idempotency Bypass | Integration, API, Infrastructure/Async | Financial Integrity (§7.15), Concurrency (§7.18), Reliability/Failure (§7.19), Redis (§6.5) |
| **RISK-004** Floating-Point Precision | Unit, API, Database | Boundary (§7.4), Financial Integrity (§7.15), Data Integrity (§7.16) |
| **RISK-005** Failed Transfer No Refund | Integration, API, Infrastructure/Async | Financial Integrity (§7.15), Recovery (§7.20), Reliability/Failure (§7.19) |

### Authentication Risks

| Risk | Testing Levels | Testing Types |
|---|---|---|
| **RISK-008** No Rate Limiting | API, E2E | Security (§7.14), Authentication (§7.12), Performance (§7.21) |
| **RISK-009** Math.random() OTP | Unit, API | Security (§7.14), Authentication (§7.12), Negative (§7.3) |
| **RISK-010** No OTP Lockout | API, E2E | Security (§7.14), Authentication (§7.12), Negative (§7.3) |
| **RISK-011** No JWT Revocation | API, E2E | Authentication (§7.12), Security (§7.14), Session (§7.12) |

### Authorization Risks

| Risk | Testing Levels | Testing Types |
|---|---|---|
| **RISK-013–016** IDOR/BOLA | API, E2E | Authorization (§7.13), Security (§7.14), Negative (§7.3) |

### Infrastructure Risks

| Risk | Testing Levels | Testing Types |
|---|---|---|
| **RISK-021** synchronize: true | Infrastructure | Resilience (§7.26), Production Smoke (§7.27) |
| **RISK-024** Seed Script | Infrastructure | Security (§7.14), Reliability/Failure (§7.19) |

---

## 10. Testing Priority Matrix

| Risk Area | Risk Level | Testing Priority | Required Depth | Key Testing Types |
|---|---|---|---|---|
| **Auth rate limiting** | Critical | P0 | Maximum | Security, Brute-force simulation |
| **OTP security** | Critical | P0 | Maximum | Security, Authentication |
| **Transfer financial integrity** | High | P0 | Maximum | Financial Integrity, ACID, Concurrency, Recovery |
| **Wallet balance correctness** | High | P0 | Maximum | Financial Integrity, Database, Concurrency |
| **Authorization / IDOR** | High | P0–P1 | Deep | Authorization, Security, Negative |
| **Idempotency** | High | P0 | Deep | Concurrency, Financial Integrity, Resilience |
| **JWT / session security** | High | P1 | Deep | Authentication, Security |
| **BullMQ processing** | Medium | P1–P2 | Standard+ | Reliability, Recovery, Async Processing |
| **Exchange rate accuracy** | Medium | P2 | Standard | Financial Integrity, Data Integrity |
| **Database constraints** | High | P1 | Deep | Database, ACID, Data Integrity |
| **API contract / validation** | Medium | P2 | Standard | API Contract, Validation, Negative |
| **Frontend state management** | Medium | P2 | Standard | E2E, Functional, Usability |
| **Infrastructure config** | High | P1 | Deep | Infrastructure, Resilience |
| **Performance under load** | Medium | P2 | Standard | Performance, Concurrency |
| **Observability** | Medium | P2 | Standard | Observability |

---

## 11. Assumptions and Areas Requiring Validation

The following items could not be fully determined from code inspection alone and **require validation during testing**:

| # | Item | Reason | Validation Method |
|---|---|---|---|
| 1 | `UpdateUserDto` field restrictions | DTO file not fully inspected; `whitelist: true` may strip unauthorized fields | API test: attempt PATCH with restricted fields |
| 2 | Wallet balance CHECK constraint in PostgreSQL | Entity definition doesn't show CHECK; may exist as migration or manual DDL | Database schema inspection |
| 3 | BullMQ stalled job configuration | No explicit `stalledInterval` observed in BullMQ module config | Configuration review and failure testing |
| 4 | Production `NODE_ENV` value | Cannot verify production environment variable from code | Deployment configuration review |
| 5 | Exchange rate update mechanism | Only seed data observed; unclear if rates are updated in production | Operational review |
| 6 | Health check endpoint depth | `app.controller.ts` not fully inspected for health check logic | API testing |
| 7 | NestJS graceful shutdown behavior | NestJS may have default shutdown hooks for BullMQ; requires verification | Deployment testing |
| 8 | Render and Vercel deployment configuration | No render.yaml or vercel.json inspected | Infrastructure review |
| 9 | JWT expiry enforcement in practice | Configured as `24h` default; actual enforcement requires testing | Authentication testing |
| 10 | Error response content across all endpoints | Only transfer error messages fully inspected | API response audit |

---

## 12. Risk-Based Testing Strategy for WrightPay

### Principle: Proportional Testing Effort Based on Business Risk

Testing effort will **NOT** be distributed equally across all features and components. Instead, WrightPay QA applies a **risk-proportional testing strategy** where the depth, breadth, and automation priority of testing is determined by the business risk each component carries.

### Why Risk-Based Testing?

WrightPay is a **financial application**. The consequences of a defect in money transfer logic, authentication, or authorization are fundamentally different from the consequences of a misaligned UI element or a missing loading spinner:

| Defect Type | Business Impact | Testing Investment |
|---|---|---|
| **Double-debit on concurrent transfers** | Direct financial loss, regulatory exposure | Maximum: unit + integration + API + database + concurrency + E2E + recovery |
| **OTP brute-force allowing account takeover** | Complete security compromise | Maximum: security + brute-force simulation + penetration testing |
| **Missing loading state on dashboard** | Minor UX inconvenience | Standard: E2E + manual verification |

### How Testing Effort Is Allocated

**High-risk financial and security functionality** — specifically authentication, authorization, wallet balances, transfers, idempotency, and transaction integrity — receives:

- Multiple overlapping testing types (functional, negative, boundary, security, financial integrity, concurrency, ACID, recovery)
- Multiple testing levels (unit, integration, API, database, infrastructure, E2E)
- Automated regression coverage in CI/CD
- Periodic exploratory testing sessions
- Production-safe smoke verification

**Medium-risk functional features** — beneficiary management, card lifecycle, profile management, exchange-rate display — receive:

- Standard functional and negative testing
- API contract validation
- IDOR/BOLA verification
- E2E workflow coverage

**Lower-risk UI/UX features** — cosmetic styling, responsive layout, loading animations — receive:

- Standard E2E verification
- Manual/exploratory testing
- Cross-browser compatibility checks

### Objective

The goal of this risk-based approach is to **maximize defect detection and confidence in the areas where failure would have the greatest business impact** — protecting user money, securing user accounts, and ensuring financial data integrity — while maintaining proportional coverage across the entire application.

---

## Document Status

This Risk Register is a **living document** that will be updated as:

- New risks are identified during testing
- Existing risks are validated, mitigated, or closed
- Application changes introduce new risk factors
- Test results provide evidence to re-score risk likelihood or impact

| Section                        | Status      |
|--------------------------------|-------------|
| Risk Assessment Methodology    | Complete    |
| Codebase Inspection            | Complete    |
| Financial Risks                | Complete    |
| Authentication Risks           | Complete    |
| Authorization Risks            | Complete    |
| API Risks                      | Complete    |
| Database / ACID Risks          | Complete    |
| Redis / Idempotency Risks      | Complete    |
| BullMQ / Async Risks           | Complete    |
| Frontend Risks                 | Complete    |
| Security Risks                 | Complete    |
| Infrastructure Risks           | Complete    |
| Reliability / Recovery Risks   | Complete    |
| Performance / Concurrency Risks| Complete    |
| Observability Risks            | Complete    |
| Testing Priority Matrix        | Complete    |
| Risk → Testing Traceability    | Complete    |
| Risk-Based Testing Strategy    | Complete    |

---

*End of WrightPay Risk Register — Version 1.0*

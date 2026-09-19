# WrightPay V1 Backend Security & Negative-Path Audit Report
**Step 5J — Security & Robustness QA Assessment**  
**Target Environment:** Local Docker Compose + NestJS Monolith  
**Base URL:** `http://localhost:3001/api/v1`  
**Test Suite:** Playwright Test Runner (TypeScript)  
**Execution Date:** September 18, 2026  
**Auditor:** SDET QA Automation Suite  

---

## 1. Executive Summary

This report documents the security, negative-path, authorization, input-validation, and error-handling audit conducted on the **WrightPay V1 AI-assisted backend** during **Step 5J**. WrightPay is a cross-currency remittance platform providing multi-currency wallets, beneficiary management, payment card tokenization, foreign exchange quotations, and asynchronous transfer processing via BullMQ and Redis.

The primary objective of this audit was to rigorously evaluate how the connected backend behaves when subjected to hostile, malformed, unauthorized, cross-user, or boundary-violating client requests. A total of **54 dedicated automated security test cases** were executed across 6 test suites, resulting in **54 passed tests (100% pass rate)** with zero regressions against the existing 202-test baseline (bringing the total automated regression baseline to **256 passing tests**).

### Key Audit Outcomes
1. **Strong Authentication & Authorization Controls:** The NestJS `JwtAuthGuard` and route-level ownership filters effectively enforce strict multi-user data isolation. Cross-user IDOR attempts across wallets, beneficiaries, cards, transactions, and transfer initiation were 100% blocked (returning 404 Not Found without leaking existence).
2. **Robust Password Hashing & PCI-DSS Posture:** The backend utilizes modern **Argon2id** password hashing (`$argon2id$v=19...`) rather than legacy algorithms. Full 16-digit Primary Account Numbers (PAN) and CVV security codes are discarded at the controller boundary; only `lastFourDigits` are stored in PostgreSQL and returned via APIs.
3. **User-Scoped Idempotency Protection:** The Redis idempotency layer incorporates the authenticated `userId` in the Redis cache key (`wrightpay:idempotency:transfer:${userId}:${key}`). Duplicate submissions with identical keys across distinct users do not collide or cross-contaminate. Replays with tampered payloads are safely blocked with `409 Conflict`.
4. **Architectural Error-Handling Weakness (WP-QA-003 Expansion):** The audit revealed that every endpoint accepting an entity UUID in the URL path (`GET /transactions/:id`, `DELETE /beneficiaries/:id`, `POST /cards/:id/freeze`, `POST /cards/:id/unfreeze`, `POST /cards/:id/deactivate`, `DELETE /cards/:id`) lacks NestJS `ParseUUIDPipe` and lacks a database exception filter. When a non-UUID string is passed, PostgreSQL rejects the query with code `22P02`, resulting in unhandled **HTTP 500 Internal Server Error** responses rather than structured 400 Bad Request responses.
5. **Data Validation Gap (WP-QA-005):** Beneficiary name validation accepts whitespace-only strings (e.g. `'   '`), which are subsequently trimmed and persisted as empty strings `""` in PostgreSQL.

> [!IMPORTANT]
> **Audit Scope & Classification Notice:**  
> This evaluation is an **automated SDET security and negative-path QA audit**, designed to test application-level security controls, input validation pipes, authorization boundaries, and error resiliency. It is **NOT** a manual penetration test, red-team exercise, or formal cryptographic review. This audit does not certify the application as "bug-free", "fully secure", or "production-ready".

---

## 2. Scope & Target Boundaries

The audit evaluated all publicly exposed and authenticated HTTP endpoints defined in the WrightPay V1 REST API contract:

| Domain | Base Path | Endpoints Tested | Security Focus |
|---|---|---|---|
| **Authentication** | `/api/v1/auth` | `/signup`, `/verify-email`, `/login`, `/logout` | Header tampering, credential leakage, JWT verification |
| **Users** | `/api/v1/users` | `GET /me`, `PATCH /me` | Privilege escalation, parameter tampering, profile isolation |
| **Wallets** | `/api/v1/wallets` | `GET /me` | Read-model idempotence, balance precision, unauthorized modification |
| **Beneficiaries** | `/api/v1/beneficiaries` | `GET /`, `POST /`, `DELETE /:id` | Payout rail invariants, soft-delete bypass, IDOR, path 500s |
| **Cards** | `/api/v1/cards` | `GET /`, `POST /`, `POST /:id/freeze`, `POST /:id/unfreeze`, `POST /:id/deactivate`, `DELETE /:id` | PCI-DSS data leakage, state transition integrity, cross-user manipulation |
| **Transfers** | `/api/v1/transfers` | `POST /` | Overdraft protection, negative amounts, fee tampering, idempotency |
| **Transactions** | `/api/v1/transactions` | `GET /`, `GET /:id` | Cross-user data harvesting, malformed UUID path parameter handling |
| **Exchange Rates** | `/api/v1/exchange-rates` | `GET /`, `GET /quote` | Malformed currency queries, negative quotes, data type serialization |

---

## 3. Application Architecture & Security Boundaries

```
[ HTTP Client / Attacker ]
          │
          ▼
┌────────────────────────────────────────────────────────┐
│  NestJS Gateway & Middleware                           │
│  - CORS (Whitelist: localhost:3000, vercel.app)       │
│  - ValidationPipe (whitelist: true, transform: true)   │
│  - JwtAuthGuard (Extracts sub -> req.user.id)          │
└───────────────────────┬────────────────────────────────┘
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│ In-Memory Redis Cache   │   │ PostgreSQL Database      │
│ - Idempotency Keys      │   │ - Users (Argon2id pass)  │
│   (userId-namespaced)   │   │ - Wallets (Pessimistic)  │
│ - 60s Processing Lock   │   │ - Beneficiaries (SoftDel)│
│ - 24h Response Cache    │   │ - Cards (PAN Masked)     │
└─────────────────────────┘   │ - Transactions (Immutable│
                              └────────────┬─────────────┘
                                           │
                                           ▼ (Post-Commit)
                              ┌──────────────────────────┐
                              │ BullMQ Transfers Queue   │
                              │ - Job: process-transfer  │
                              │ - Payload: { txId only } │
                              │ - Exponential Retry (3x) │
                              └──────────────────────────┘
```

---

## 4. Authentication Testing

Protected endpoints across all domains were tested against missing, corrupted, forged, and manipulated authentication tokens:

1. **Omitted Authorization Header:** Every protected route strictly rejected unauthenticated requests with `HTTP 401 Unauthorized` and `{ statusCode: 401, message: "Unauthorized" }`.
2. **Malformed Headers:** Empty headers (`Authorization: ""`), bare schemes (`Bearer`), whitespace tokens (`Bearer   `), and alternate schemes (`Basic ...`, `Token ...`) were consistently rejected with HTTP 401.
3. **Random Garbage Tokens:** Submitting non-JWT random strings (e.g. `Bearer not_a_real_token_123456`) was caught by the JWT verification layer and rejected with HTTP 401 without unhandled 500 crashes.
4. **Account Status Enforcement:** Setting `accountStatus: 'suspended'` in the database immediately prevented the user from creating transfers, returning `HTTP 403 Forbidden` (`Account is suspended or closed`).

---

## 5. Authorization & Insecure Direct Object References (IDOR)

A multi-user environment was provisioned using independent accounts (**User A** and **User B**), each possessing separate funded wallets, registered beneficiaries, tokenized cards, and executed transactions:

1. **Transaction IDOR (`GET /transactions/:id`):** User A requested User B's transaction UUID. The backend returned `HTTP 404 Not Found` (`Transaction not found`), preventing transaction enumeration and financial data harvesting.
2. **Beneficiary Segregation (`GET /beneficiaries`):** User A's beneficiary list contained only User A's records; User B's beneficiaries were completely omitted.
3. **Beneficiary Deletion IDOR (`DELETE /beneficiaries/:id`):** User A attempted to delete User B's beneficiary. The request was rejected with `HTTP 404 Not Found`, and direct database inspection verified that User B's record remained active (`deletedAt IS NULL`).
4. **Card Management IDOR (`POST /cards/:id/freeze`, `/deactivate`, `DELETE /cards/:id`):** User A attempted to freeze, deactivate, and delete User B's card. All attempts returned `HTTP 404 Not Found`, and PostgreSQL confirmed User B's card remained in `active` status.
5. **Funding Source IDOR (`POST /transfers` with spoofed `sourceWalletId`):** User A attempted to fund a transfer by specifying User B's wallet UUID. The request was blocked with `HTTP 404 Not Found` (`Source wallet not found`), leaving User B's balance completely untouched.
6. **Recipient IDOR (`POST /transfers` with spoofed `beneficiaryId`):** User A attempted to transfer funds to User B's beneficiary. The request was rejected with `HTTP 404 Not Found` (`Beneficiary not found`), and User A's wallet was not debited.

---

## 6. JWT & Cryptographic Security Token Testing

The application's JWT verification implementation (`JwtAuthGuard` + `JwtService.verifyAsync`) was evaluated against common cryptographic token vulnerabilities:

1. **Signature Forgery:** Tokens signed using an attacker-controlled secret key were immediately rejected with `HTTP 401 Unauthorized`.
2. **Signature Stripping:** Structurally truncated tokens (`header.payload` without a signature) were rejected with `HTTP 401 Unauthorized`.
3. **Payload Modification:** Altering the payload claims (e.g. modifying `sub` to another user's UUID or changing `email`) without re-signing caused signature mismatch and was rejected with `HTTP 401 Unauthorized`.
4. **Expired Tokens:** Tokens with an expiration timestamp (`exp`) in the past were rejected with `HTTP 401 Unauthorized`.
5. **Algorithm "none" Attack:** Tokens crafted with `"alg": "none"` were rejected with `HTTP 401 Unauthorized`.

---

## 7. Input Validation & Parameter Tampering Testing

The application uses NestJS `ValidationPipe` with `{ whitelist: true, transform: true }`:

1. **Privilege Escalation on `PATCH /users/me`:** When an attacker submitted unauthorized administrative fields (`id`, `role: 'SUPERADMIN'`, `isAdmin: true`, `accountStatus: 'closed'`, `kycStatus: 'approved'`, `balance: 999999999`, `passwordHash: '...'`), the `whitelist: true` pipe silently stripped all non-whitelisted fields. PostgreSQL verification confirmed that only legitimate DTO fields (`name`) were updated, and no privileged database columns were altered.
2. **DTO Type Validation:** Submitting non-string types for string fields (e.g. integer `name`) or invalid enum strings for `defaultCurrency` returned structured `HTTP 400 Bad Request` responses.
3. **Beneficiary Input Invariants:** Unsupported currencies, invalid payout methods, and missing `upiId` on UPI beneficiaries were strictly rejected with HTTP 400.
4. **Transfer Fee Tampering:** When an attacker submitted `{ fee: 0.0, status: 'completed', exchangeRate: 1000.0 }` in the transfer creation body, the backend stripped the client-supplied values and strictly applied the server-mandated 25.00 EUR fee and `PENDING` initial status.

---

## 8. HTTP Method & Path Abuse Testing

1. **Unsupported HTTP Methods:** Submitting unsupported methods (`PUT /users/me`, `POST /wallets/me`, `GET /transfers`) was consistently handled with `HTTP 404 Not Found` by the NestJS router.
2. **Path Traversal Probes:** URL-encoded directory traversal sequences (`/transactions/..%2f..%2fetc%2fpasswd`) were handled safely without server crash or file system disclosure.

---

## 9. Information Disclosure & Sensitive Data Protection

1. **Credential Exposure:** Neither `passwordHash`, salt, nor plain passwords were leaked in `POST /auth/signup`, `POST /auth/login`, `GET /users/me`, or `PATCH /users/me`.
2. **Argon2id Hashing:** Database inspection confirmed passwords are stored using the **Argon2id** algorithm (`$argon2id$v=19$m=65536,p=4,t=3$...`).
3. **PCI-DSS Card Security:**
   - The `cards` API responses (`POST /cards`, `GET /cards`) return only `lastFourDigits`.
   - Inspection of PostgreSQL table `cards` via `information_schema.columns` confirmed that columns for full PAN, card number, CVV, or CVC do not exist.
4. **Asynchronous Queue Job Privacy:** BullMQ transfer job payloads were inspected in Redis. The payload contained exclusively `{ transactionId: "uuid" }`, with zero personal identifiable information (PII), card data, or account credentials.

---

## 10. Error Handling & 500 Audit (WP-QA-003 Expansion)

A critical focus was auditing endpoint behavior when given non-UUID path parameters:

| Endpoint | Input Tested | Expected | Actual Status | Root Cause |
|---|---|---|---|---|
| `GET /transactions/:id` | `not-a-uuid` | 400 Bad Request | **500 Internal Server Error** | Missing `ParseUUIDPipe`; PostgreSQL error `22P02` |
| `DELETE /beneficiaries/:id` | `not-a-uuid` | 400 Bad Request | **500 Internal Server Error** | Missing `ParseUUIDPipe`; PostgreSQL error `22P02` |
| `POST /cards/:id/freeze` | `not-a-uuid` | 400 Bad Request | **500 Internal Server Error** | Missing `ParseUUIDPipe`; PostgreSQL error `22P02` |
| `POST /cards/:id/unfreeze` | `not-a-uuid` | 400 Bad Request | **500 Internal Server Error** | Missing `ParseUUIDPipe`; PostgreSQL error `22P02` |
| `POST /cards/:id/deactivate` | `not-a-uuid` | 400 Bad Request | **500 Internal Server Error** | Missing `ParseUUIDPipe`; PostgreSQL error `22P02` |
| `DELETE /cards/:id` | `not-a-uuid` | 400 Bad Request | **500 Internal Server Error** | Missing `ParseUUIDPipe`; PostgreSQL error `22P02` |
| `POST /transfers` (body UUID) | `not-a-uuid` | 400 Bad Request | **400 Bad Request** | Caught by `ValidationPipe` (`@IsUUID()`) |

**Observation:** While request body DTOs validate UUIDs properly at the API boundary, all URL path parameters bypass validation and reach the database driver directly, triggering unhandled server exceptions.

---

## 11. Financial Endpoint Security & Idempotency

1. **Overdraft Protection:** Attempting a transfer where `sendAmount + fee > wallet.balance` was strictly rejected with `HTTP 400 Bad Request` (`Insufficient wallet balance`). Wallet balance remained completely unchanged, and zero transaction rows were inserted in PostgreSQL.
2. **Negative & Zero Amounts:** Transfers with `sendAmount: -50` or `sendAmount: 0` were rejected with HTTP 400 without wallet mutation.
3. **Soft-Deleted Beneficiary Abuse:** Transfers targeting a soft-deleted beneficiary were rejected with `HTTP 404 Not Found` (`Beneficiary not found`), preventing payouts to revoked accounts.
4. **Cross-User Idempotency Isolation:** When User A and User B submitted transfers using the exact same `Idempotency-Key` string (`shared-idempotency-key-...`), both requests succeeded independently. User B received a distinct transaction with their own funds, proving that Redis idempotency keys are properly scoped per user (`wrightpay:idempotency:transfer:${userId}:${key}`).
5. **Payload Mismatch Detection:** Replaying the same `Idempotency-Key` with an altered `sendAmount` was rejected with `HTTP 409 Conflict` (`Idempotency key was already used with a different request payload`).
6. **Pre-Commit Atomicity & Lock Cleanup:** When a transfer failed pre-commit validation (e.g. zero balance), the initial Redis processing lock was immediately deleted, allowing the customer to safely retry once funds were deposited.

---

## 12. Security Findings Summary

| Finding ID | Severity | Category | Title | Status |
|---|---|---|---|---|
| **WP-QA-001** | High | Financial Integrity | Missing Automatic Refund After Asynchronous Settlement Failure | Confirmed (Phases 5F, 5I, 5J) |
| **WP-QA-002** | Medium | Reliability / Enqueue | Potential Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error | Confirmed (Phases 5F, 5I, 5J) |
| **WP-QA-003** | Medium | Error Handling / Robustness | Malformed Path Parameter UUID Yields HTTP 500 Across All Domains | Massively Strengthened (Phase 5J) |
| **WP-QA-004** | Low | Contract Discrepancy | `GET /exchange-rates` Returns Exchange Rate Serialized as String | Confirmed (Phases 5H, 5J) |
| **WP-QA-005** | Low | Input Validation | Whitespace-Only Beneficiary Name Accepted and Persisted as Empty String | **NEW Finding (Phase 5J)** |
| **WP-QA-006** | Low | Configuration | Missing `forbidNonWhitelisted: true` in Global `ValidationPipe` | **NEW Observation (Phase 5J)** |

---

## 13. Limitations of this Security Audit

1. **No Penetration Testing:** This automated audit did not perform network-level vulnerability scans, OS-level exploitation, Docker container breakout tests, or manual fuzzing of underlying infrastructure.
2. **No Rate Limiting / DDoS Testing:** Rate limiting (e.g. `@nestjs/throttler`) is not currently active on public endpoints (e.g. `/auth/signup`, `/auth/login`, `/exchange-rates`). High-frequency brute-force testing was deferred to Phase 5K (Concurrency & Load).
3. **No External Payment Gateway Interaction:** Simulated banking settlement was tested via the application's internal simulation hooks; real banking partner APIs (SEPA, SWIFT, UPI gateway) were not exercised.
4. **No Direct Socket / Worker Exploitation:** Redis and BullMQ were evaluated through application behavior and data inspection; direct socket manipulation was out of scope.

---

## 14. Conclusion & Next Steps

The WrightPay V1 backend demonstrates commendable security engineering in core financial areas: strict multi-user IDOR isolation, user-scoped Redis idempotency caching, Argon2id credential hashing, and PCI-compliant card tokenization. 

However, resilience against malformed inputs requires attention:
- Applying `new ParseUUIDPipe()` across all controller `@Param('id')` parameters will eliminate the widespread 500 error vulnerability documented in **WP-QA-003**.
- Implementing automated compensation/refund logic for failed asynchronous jobs is essential for financial balance consistency (**WP-QA-001**).

The test automation baseline has expanded from **202 to 256 automated tests**, all passing with zero regressions and clean TypeScript typechecking.

The application is ready to proceed to:
**STEP 5K — CONCURRENCY, RACE CONDITIONS & QUEUE RELIABILITY TESTING**.

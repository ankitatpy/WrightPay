# WrightPay V1 — Finding Traceability Matrix
**Traceability from Findings to Automated Tests, Evidence, and Requirements**  
**Assessment Date:** September 19, 2026  
**Status:** Canonical Traceability Record  

---

## 1. Master Traceability Matrix

| Finding ID | Title | Test File & Line | Phase | Evidence Type | Evidence Source | Requirement / Contract Basis |
|---|---|---|:---:|---|---|---|
| **WP-QA-001** | Missing Automatic Refund After Settlement Failure | `tests/concurrency/queue-reliability.spec.ts:265`<br>`tests/transfers/transfers.spec.ts:977`<br>`tests/integration/cross-domain.spec.ts:182` | 5F, 5I, 5K | **AUTOMATED EVIDENCE** | DB `wallets.balance` remains debited (325 EUR); `transactions` has 0 refund records | Financial Ledger Invariant: Failed payout must restore customer funds via compensating credit |
| **WP-QA-002** | Risk of Orphaned PENDING Transfer via Unhandled Queue Error | `tests/concurrency/queue-reliability.spec.ts:324`<br>`tests/transfers/transfers.spec.ts:916` | 5F, 5K | **STATIC CODE / ARCHITECTURAL EVIDENCE** | `transfers.service.ts:175-211` commit occurs before BullMQ enqueue; catch block merely logs | Distributed Transaction Invariant: State mutation must not commit if asynchronous dispatch cannot be guaranteed |
| **WP-QA-003** | Malformed Path UUID Causes HTTP 500 Across Endpoints | `tests/security/error-handling-500.spec.ts:18-120`<br>`tests/transactions/transactions.spec.ts:705` | 5G, 5J | **AUTOMATED EVIDENCE** | HTTP 500 responses across 6 endpoints; PostgreSQL error code `22P02` logged | REST API Contract: Invalid client input must return 400 Bad Request or 404 Not Found, never 500 |
| **WP-QA-004** | Serialized Exchange Rate Type Discrepancy (String vs Number) | `tests/exchange-rates/exchange-rates.spec.ts:60`<br>`tests/security/error-handling-500.spec.ts:133` | 5H, 5J | **AUTOMATED EVIDENCE** | `typeof item.rate === 'string'` in `GET /exchange-rates` JSON response | OpenAPI 3.0 Contract Specification (`docs/WrightPay-API.yaml` line 348: `type: number`) |
| **WP-QA-005** | Beneficiary Accepts Whitespace Name and Persists Empty String | `tests/security/input-validation.spec.ts:246` | 5J | **AUTOMATED EVIDENCE** | HTTP 201 response with `"name": ""`; database `beneficiaries` record persists empty string | Input Validation Requirement: Mandatory string fields must not permit blank/empty values |
| **WP-QA-006** | Global ValidationPipe Lacks `forbidNonWhitelisted: true` | `tests/security/input-validation.spec.ts:183` | 5J | **STATIC CODE / ARCHITECTURAL EVIDENCE** | `main.ts:22` configures `{ whitelist: true }` without `{ forbidNonWhitelisted: true }` | API Security Best Practice: Strict schema validation should reject unmapped payload properties |
| **WP-QA-007** | Idempotency Lock Deletion on Early Failure Stalls Polling Requests | `tests/concurrency/idempotency-race.spec.ts:392` | 5K | **AUTOMATED EVIDENCE** | Request 1 returns 400 in 45ms; Request 2 stalls 2,680ms and returns 409 Conflict | Idempotency Synchronization Contract: Failed operations should fail fast or allow immediate retries |
| **WP-QA-008** | Low Entropy in Transfer Reference Risks Unique Constraint Collision | `tests/concurrency/financial-invariants.spec.ts:145` | 5K | **STATIC CODE / ARCHITECTURAL EVIDENCE** | `transfers.service.ts:51-55` uses `crypto.randomBytes(4)` (32-bit entropy) | Enterprise Reliability Requirement: Transaction references must possess sufficient entropy to prevent collisions |

---

## 2. Evidence Classification Details

### Category A: Automated Dynamic Evidence
These findings are backed by automated Playwright test executions running against live runtime components (API, PostgreSQL, Redis, BullMQ):
- **WP-QA-001**: Proven dynamically in `queue-reliability.spec.ts`. The test triggers simulated banking failure via recipient name `SIMULATE_FAILURE`, waits for all 3 worker retries to exhaust, verifies the transaction status is marked `FAILED` with reason `"Simulated banking settlement failure"`, and queries PostgreSQL `wallets` table to prove the balance remains debited at 325.00 EUR with zero refund records.
- **WP-QA-003**: Proven dynamically across 16 tests in `error-handling-500.spec.ts`. Submitting non-UUID strings (`'not-a-valid-uuid'`, `'12345'`) produces deterministic HTTP 500 responses across transactions, beneficiaries, and cards endpoints.
- **WP-QA-004**: Proven dynamically in `exchange-rates.spec.ts` and `error-handling-500.spec.ts`. The test asserts `typeof rate === 'string'` against the API response, contradicting the OpenAPI specification.
- **WP-QA-005**: Proven dynamically in `input-validation.spec.ts`. Submitting `name: "   "` returns HTTP 201 with `"name": ""` and persists an empty string into the PostgreSQL database.
- **WP-QA-007**: Proven dynamically in `idempotency-race.spec.ts`. Firing two identical requests concurrently on an underfunded wallet proves that Request 1 fails immediately in 45ms with 400 Bad Request, while Request 2 stalls in the polling loop for 2,680ms and returns a misleading 409 Conflict.

### Category B: Static Code & Architectural Evidence
These findings identify structural design vulnerabilities through rigorous code and mathematical analysis where dynamic runtime injection was constrained by test environment boundaries:
- **WP-QA-002**: Identified via static code inspection of `transfers.service.ts:175-211`. The database transaction commits before BullMQ queueing. A queue enqueue failure in the subsequent block is merely logged, leaving the transaction in `PENDING` state with money debited. In adherence to testing safety rules, live network sabotage of Redis was not injected.
- **WP-QA-006**: Identified via static code inspection of `main.ts:22`. The global `ValidationPipe` whitelist strips unexpected fields rather than rejecting them with 400 Bad Request. Verified dynamically by sending excess properties that are silently ignored.
- **WP-QA-008**: Identified via cryptographic entropy and combinatorial analysis of `transfers.service.ts:51-55`. The 4-byte random hexadecimal string appended to the date string provides 32 bits of entropy per calendar day, resulting in a 50% collision probability at ~77,163 daily transactions under the Birthday Paradox.

---

## 3. Requirement & Invariant Cross-Reference

| Finding ID | Financial Invariant | Security Boundary | API Specification | Code Component |
|:---:|:---:|:---:|:---:|:---:|
| **WP-QA-001** | Balance Conservation / Refund Integrity | — | — | `transfers.processor.ts:111-134` |
| **WP-QA-002** | Atomic State Commitment | — | — | `transfers.service.ts:175-211` |
| **WP-QA-003** | — | Exception Boundary / Denial-of-Service | REST Status Code Standards | Controllers / `ParseUUIDPipe` |
| **WP-QA-004** | — | — | OpenAPI 3.0 (`docs/WrightPay-API.yaml`) | `ExchangeRate` Entity |
| **WP-QA-005** | Ledger Auditability | Input Sanitization | — | `create-beneficiary.dto.ts` |
| **WP-QA-006** | — | Strict Schema Validation | — | `main.ts:22` |
| **WP-QA-007** | Client State Transparency | — | Idempotency Protocol | `idempotency.service.ts:100-153` |
| **WP-QA-008** | Transaction Uniqueness | — | Database Unique Constraint | `transfers.service.ts:51-55` |

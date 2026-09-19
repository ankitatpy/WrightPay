# WrightPay V1 Security Findings Register
**Step 5J — Backend Security & Negative-Path Audit**  
**Last Updated:** September 18, 2026  
**Status:** Open / Unfixed (Audit Phase Only — Production Code Frozen)  

---

## Summary Matrix

| ID | Title | Severity | Category | Status | Discovered / Strengthened In |
|---|---|---|---|---|---|
| **WP-QA-001** | Missing Automatic Refund on Asynchronous Transfer Failure | **High** | Financial Integrity | Confirmed | Phase 5F, 5I, 5J |
| **WP-QA-002** | Risk of Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error | **Medium** | Reliability / Queues | Confirmed | Phase 5F, 5I, 5J |
| **WP-QA-003** | Malformed Path Parameter UUID Causes HTTP 500 Across All Domains | **Medium** | Error Handling / API Boundary | **Massively Strengthened** | Phase 5G, 5J |
| **WP-QA-004** | Serialized Exchange Rate Type Discrepancy (String vs OpenAPI Number) | **Low** | Contract Discrepancy | Confirmed | Phase 5H, 5J |
| **WP-QA-005** | Beneficiary Creation Accepts Whitespace-Only Name and Persists Empty String | **Low** | Input Validation / Data Integrity | **NEW Finding** | Phase 5J |
| **WP-QA-006** | Global ValidationPipe Lacks `forbidNonWhitelisted: true` | **Low** | Configuration / Tampering | **NEW Observation** | Phase 5J |

---

## Detailed Finding Records

### Finding WP-QA-001: Missing Automatic Refund After Asynchronous Settlement Failure

- **Finding ID:** `WP-QA-001`
- **Title:** Missing automatic refund/compensating transaction after asynchronous settlement failure
- **Severity:** High
- **Category:** Financial Integrity / Ledger Consistency
- **Endpoint / Component:** `POST /api/v1/transfers` & `TransfersProcessor` (BullMQ Worker)
- **Preconditions:**
  1. Authenticated user with a funded EUR wallet (e.g. 500.00 EUR).
  2. Registered beneficiary whose name contains `'SIMULATE_FAILURE'`.
- **Steps to Reproduce:**
  1. Submit transfer of 100.00 EUR with fee 25.00 EUR (`totalDeduction: 125.00 EUR`).
  2. Immediate response returns `201 Created` with status `PENDING`.
  3. Wallet balance is debited from 500.00 EUR to 375.00 EUR.
  4. BullMQ worker picks up job `transfer-${txId}` and executes simulated gateway settlement.
  5. The job fails, retries 3 times with exponential backoff, and marks transaction as `FAILED` (`failureReason: "Simulated banking settlement failure"`).
  6. Inspect wallet balance via `GET /api/v1/wallets/me` and database table `wallets`.
- **Expected Behavior:**
  When an asynchronous settlement permanently fails, the system should issue an automated compensating transaction (refund) crediting the customer's wallet (or release reserved funds), restoring the balance to 500.00 EUR.
- **Actual Behavior:**
  The transaction transitions to `FAILED`, but the wallet balance **permanently remains at 375.00 EUR**. No refund transaction is generated.
- **Evidence:**
  ```json
  // GET /api/v1/transactions/:id
  {
    "id": "203a9f02-a083-4927-aa72-a0b8aa754d92",
    "status": "FAILED",
    "failureReason": "Simulated banking settlement failure"
  }
  // GET /api/v1/wallets/me
  {
    "balance": 375.00 // Expected 500.00 after failed payout
  }
  ```
- **Impact:** Permanent loss of customer funds upon external payment rail rejection; financial ledger imbalance.
- **Recommendation:**
  In `TransfersProcessor.processTransfer()`, catch terminal failure and execute a compensating database transaction that updates the wallet balance (`balance = balance + sendAmount + fee`) and creates a `REFUND` transaction record.
- **Current Status:** Confirmed; open in V1.
- **Covering Automated Tests:**
  - `tests/transfers/transfers.spec.ts:977`
  - `tests/integration/cross-domain.spec.ts:182`

---

### Finding WP-QA-002: Potential Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error

- **Finding ID:** `WP-QA-002`
- **Title:** PostgreSQL commit succeeds before BullMQ enqueueing; unhandled enqueue error risks permanently orphaned PENDING transfers
- **Severity:** Medium
- **Category:** Reliability / Distributed Transaction Integrity
- **Endpoint / Component:** `TransfersService.executeTransferTransaction()` (`backend/src/modules/transfers/transfers.service.ts:186-211`)
- **Preconditions:** Authenticated user with sufficient balance.
- **Steps to Reproduce (Code Analysis & Simulation):**
  1. Inspect `transfers.service.ts` lines 180–211.
  2. Database transaction commits at line 183: `await queryRunner.commitTransaction()`.
  3. BullMQ enqueueing occurs at line 188: `await this.transfersQueue.add(...)` inside a `try/catch` block.
  4. If Redis crashes or rejects the enqueue operation, the catch block logs the error:
     ```ts
     catch (queueError) {
       this.logger.error(`Failed to enqueue BullMQ transfer job...: ${queueError.message}`);
     }
     ```
  5. The method continues and returns `HTTP 201 Created` with the transaction committed in `PENDING` state.
- **Expected Behavior:**
  If the asynchronous processing job cannot be queued, the financial mutation should either be rolled back, or enqueued via a durable transactional outbox pattern to guarantee eventual delivery.
- **Actual Behavior:**
  PostgreSQL commits the wallet debit and transaction row *before* queueing. If queueing fails, the transaction remains permanently in `PENDING` status with no worker assigned to process it.
- **Evidence:** Source code in `transfers.service.ts:187-211`.
- **Impact:** Customer money is debited, but transfer never settles or updates.
- **Recommendation:**
  Implement the Transactional Outbox Pattern: store outbound jobs in a PostgreSQL `outbox` table within the same transaction that debits the wallet, and use a dedicated relay/sweeper to dispatch outbox records to BullMQ.
- **Current Status:** Confirmed design gap in V1.
- **Covering Automated Tests:**
  - `tests/transfers/transfers.spec.ts:904`
  - `tests/integration/cross-domain.spec.ts:310`

---

### Finding WP-QA-003: Malformed Path Parameter UUID Causes HTTP 500 Across All Domains

- **Finding ID:** `WP-QA-003`
- **Title:** Malformed non-UUID path parameters cause unhandled PostgreSQL query crashes resulting in HTTP 500 Internal Server Error
- **Severity:** Medium
- **Category:** Error Handling / API Boundary Validation
- **Endpoint / Component:**
  - `GET /api/v1/transactions/:id`
  - `DELETE /api/v1/beneficiaries/:id`
  - `POST /api/v1/cards/:id/freeze`
  - `POST /api/v1/cards/:id/unfreeze`
  - `POST /api/v1/cards/:id/deactivate`
  - `DELETE /api/v1/cards/:id`
- **Preconditions:** Valid bearer token for an authenticated user.
- **Steps to Reproduce:**
  1. Issue `GET /api/v1/transactions/not-a-valid-uuid` with Bearer token.
  2. Issue `DELETE /api/v1/beneficiaries/not-a-valid-uuid` with Bearer token.
  3. Issue `POST /api/v1/cards/not-a-valid-uuid/freeze` with Bearer token.
- **Expected Behavior:**
  The request should be intercepted at the API boundary and rejected with `HTTP 400 Bad Request` (`Validation failed (uuid expected)`).
- **Actual Behavior:**
  The controller receives the string without validation and passes it to TypeORM repository `findOne({ where: { id, userId } })`. PostgreSQL rejects the query with driver error:
  `QueryFailedError: invalid input syntax for type uuid: "not-a-valid-uuid" (code: 22P02)`.
  Because no global database exception filter exists, NestJS defaults to `HTTP 500 Internal Server Error` with body `{"statusCode":500,"message":"Internal server error"}`.
- **Evidence:**
  Automated tests in `tests/security/error-handling-500.spec.ts:7-60` all confirm HTTP 500.
- **Impact:**
  Unhandled 500 responses pollute server error monitoring, hide real backend bugs, degrade API availability SLAs, and violate REST API design standards.
- **Recommendation:**
  1. Add `new ParseUUIDPipe()` to all route `@Param('id')` decorators:
     ```ts
     @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
     ```
  2. Register a global TypeORM exception filter in `main.ts` that catches PostgreSQL error code `22P02` and maps it to `BadRequestException`.
- **Current Status:** Confirmed; expanded in Phase 5J across 6 distinct endpoints.
- **Covering Automated Tests:**
  - `tests/security/error-handling-500.spec.ts:7-60`

---

### Finding WP-QA-004: Serialized Exchange Rate Type Discrepancy (String vs OpenAPI Number)

- **Finding ID:** `WP-QA-004`
- **Title:** `GET /exchange-rates` returns rate property serialized as string while OpenAPI specification documents number
- **Severity:** Low
- **Category:** API Contract Discrepancy
- **Endpoint / Component:** `GET /api/v1/exchange-rates` (`backend/src/modules/exchange-rates/exchange-rates.service.ts`)
- **Preconditions:** None (public endpoint).
- **Steps to Reproduce:**
  1. Send `GET /api/v1/exchange-rates`.
  2. Inspect JSON response elements:
     ```json
     [
       {
         "id": "...",
         "sourceCurrency": "EUR",
         "targetCurrency": "USD",
         "rate": "1.0850"
       }
     ]
     ```
- **Expected Behavior:**
  According to `docs/WrightPay-API.yaml`, `rate` is documented as `type: number, format: float`.
- **Actual Behavior:**
  `typeof rate === 'string'`. PostgreSQL `numeric` column types are returned as strings by `pg` driver by default to preserve decimal precision, but no serialization transformer or DTO mapped it to a number.
- **Evidence:**
  `tests/security/error-handling-500.spec.ts:98-112`.
- **Impact:** Client SDK generators and TypeScript consumers expecting a number may encounter runtime type errors or arithmetic NaN bugs.
- **Recommendation:**
  Use `@Transform(({ value }) => parseFloat(value))` or explicit DTO mapping in `ExchangeRatesController` before returning.
- **Current Status:** Confirmed; open in V1.
- **Covering Automated Tests:**
  - `tests/exchange-rates/exchange-rates.spec.ts:16`
  - `tests/security/error-handling-500.spec.ts:98`

---

### Finding WP-QA-005: Beneficiary Creation Accepts Whitespace-Only Name and Persists Empty String

- **Finding ID:** `WP-QA-005`
- **Title:** `CreateBeneficiaryDto` accepts whitespace-only name; service trims to empty string and saves invalid beneficiary
- **Severity:** Low
- **Category:** Input Validation / Data Integrity
- **Endpoint / Component:** `POST /api/v1/beneficiaries` (`CreateBeneficiaryDto` / `BeneficiariesService.create()`)
- **Preconditions:** Authenticated user with fewer than 3 active beneficiaries.
- **Steps to Reproduce:**
  1. Send `POST /api/v1/beneficiaries` with payload:
     ```json
     {
       "name": "   ",
       "currency": "EUR",
       "payoutMethod": "bank_account",
       "accountNumber": "DE89370400440532013000",
       "bankCode": "DEUTDEDDFXX"
     }
     ```
  2. Inspect response status code and database row.
- **Expected Behavior:**
  The request should be rejected with `HTTP 400 Bad Request` (`name should not be empty`).
- **Actual Behavior:**
  `@IsNotEmpty()` passes because `'   '.length > 0`. Then `beneficiaries.service.ts:50` executes `name: dto.name.trim()`, resulting in `""`. The beneficiary is created with `HTTP 201 Created` with an empty string name in PostgreSQL.
- **Evidence:**
  Discovered during Phase 5J input validation testing: `POST /beneficiaries` with `name: '   '` returned 201.
- **Impact:** Corrupted data records; beneficiaries without identifiable names; confusion in transaction history.
- **Recommendation:**
  Add a custom validator or use `@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))` before `@IsNotEmpty()` in `CreateBeneficiaryDto`.
- **Current Status:** **NEW Finding Discovered in Phase 5J**.

---

### Finding WP-QA-006: Global ValidationPipe Lacks `forbidNonWhitelisted: true`

- **Finding ID:** `WP-QA-006`
- **Title:** Global `ValidationPipe` configuration permits unrecognized request body fields by silently stripping rather than rejecting
- **Severity:** Low
- **Category:** Security Configuration / Input Hygiene
- **Endpoint / Component:** `main.ts:32`
- **Preconditions:** Any endpoint accepting request body DTOs.
- **Steps to Reproduce:**
  1. Send `PATCH /api/v1/users/me` with:
     ```json
     {
       "name": "Valid Name",
       "role": "ADMIN",
       "isAdmin": true,
       "balance": 999999
     }
     ```
- **Expected Behavior (Strict Financial API Design):**
  Financial APIs typically enforce strict schema validation: sending unknown fields returns `HTTP 400 Bad Request` (`property role should not exist`).
- **Actual Behavior:**
  `ValidationPipe` is configured with `{ whitelist: true, transform: true }`. Non-whitelisted fields are silently dropped without error.
- **Impact:**
  While silent stripping successfully prevents parameter tampering in the database, it masks client integration bugs and hides malicious probing attempts from audit logs.
- **Recommendation:**
  Update `main.ts:32` to:
  ```ts
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  ```
- **Current Status:** **NEW Architectural Observation in Phase 5J**.

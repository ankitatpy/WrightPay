# WrightPay V1 — Master Findings Register
**Consolidated Backend Quality & Vulnerability Register**  
**Assessment Date:** September 19, 2026  
**Status:** Audit Complete — Production Code Frozen  

---

## Summary Matrix

| ID | Title | Severity | Classification | Affected Component | Discovered In | Status |
|---|---|:---:|:---:|---|:---:|:---:|
| **WP-QA-001** | Missing Automatic Refund After Asynchronous Settlement Failure | **High** | CONFIRMED DEFECT | `TransfersProcessor` (Worker) | Phase 5F, 5K | Open |
| **WP-QA-002** | Risk of Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error | **Medium** | ARCHITECTURAL RISK | `TransfersService` | Phase 5F, 5K | Open |
| **WP-QA-003** | Malformed Path Parameter UUID Causes HTTP 500 Across Multiple Endpoints | **Medium** | CONFIRMED DEFECT | All Controllers / Routing | Phase 5G, 5J | Open |
| **WP-QA-004** | Serialized Exchange Rate Type Discrepancy (String vs OpenAPI Number) | **Low** | API CONTRACT DISCREPANCY | `ExchangeRatesController` | Phase 5H, 5J | Open |
| **WP-QA-005** | Beneficiary Creation Accepts Whitespace-Only Name and Persists Empty String | **Low** | CONFIRMED DEFECT | `BeneficiariesService` | Phase 5J | Open |
| **WP-QA-006** | Global ValidationPipe Lacks `forbidNonWhitelisted: true` | **Low** | OBSERVATION | `main.ts` (Global Config) | Phase 5J | Open |
| **WP-QA-007** | Idempotency Lock Key Deletion on Early Failure Stalls Concurrent Polling Requests | **Low** | CONFIRMED IMPLEMENTATION GAP | `IdempotencyService` | Phase 5K | Open |
| **WP-QA-008** | Low Entropy in Transfer Reference Generation Risks Collision Under Volume | **Low** | ARCHITECTURAL RISK | `TransfersService` | Phase 5K | Open |

---

## Detailed Finding Records

### Finding WP-QA-001: Missing Automatic Refund After Asynchronous Settlement Failure

- **Finding ID:** `WP-QA-001`
- **Title:** Missing automatic refund / compensating transaction after asynchronous settlement failure
- **Severity:** High
- **Classification:** CONFIRMED DEFECT
- **Status:** Open in V1
- **Affected Component:** `TransfersProcessor` (BullMQ Worker)
- **Affected Endpoint:** `POST /api/v1/transfers` & background BullMQ processing
- **Description:**
  When a transfer is initiated, the database transaction immediately debits the user's wallet (`sendAmount + fee`) and marks the transaction as `PENDING`. Asynchronous settlement is delegated to BullMQ worker `TransfersProcessor`. When external payment settlement fails permanently after exhausting retries, the worker transitions the transaction status to `FAILED`, but does not execute a compensating transaction to credit the user's wallet back.
- **Preconditions:**
  1. Authenticated user with funded wallet (e.g. 400.00 EUR).
  2. Registered beneficiary whose name triggers simulated banking failure (`SIMULATE_FAILURE`).
- **Reproduction Steps:**
  1. Submit `POST /api/v1/transfers` with `sendAmount: 50.00`, `fee: 25.00` (`totalDeduction: 75.00 EUR`).
  2. Initial API response returns `201 Created` with status `PENDING`.
  3. Database wallet balance is debited from 400.00 EUR to 325.00 EUR.
  4. BullMQ worker picks up job and fails settlement, retrying 3 times with exponential backoff.
  5. On the 3rd attempt, the worker updates the transaction record to `status: 'FAILED'` with `failureReason: "Simulated banking settlement failure"`.
  6. Inspect wallet balance via `GET /api/v1/wallets/me` and database table `wallets`.
- **Expected Behavior:**
  When external settlement permanently fails, the system must execute an automated compensating transaction (or refund ledger entry) crediting the customer's wallet balance (`balance = balance + sendAmount + fee`), restoring it to 400.00 EUR.
- **Actual Behavior:**
  The transaction status changes to `FAILED`, but the wallet balance permanently remains debited at 325.00 EUR. No refund transaction is created in the database.
- **Evidence:**
  ```json
  // Database record in transactions:
  {
    "id": "18f5bf40-4277-4581-9b77-3bc1a28a2a89",
    "status": "FAILED",
    "failureReason": "Simulated banking settlement failure"
  }
  // Database record in wallets:
  {
    "balance": 325.00 // Expected 400.00 EUR
  }
  ```
- **Impact:** Permanent loss of customer funds upon external payment rail rejection; financial ledger discrepancy between the platform and external banking rails.
- **Recommendation:**
  In `TransfersProcessor.process()`, when catching terminal failure (`isLastAttempt || error.message?.includes('NON_RETRYABLE')`), execute an atomic compensating database transaction that increments the wallet balance (`balance = balance + senderAmount + fee`) and inserts a `REFUND` transaction record in the ledger.
- **Test Reference:**
  - `qa/automation/tests/concurrency/queue-reliability.spec.ts:265`
  - `qa/automation/tests/transfers/transfers.spec.ts:977`
  - `qa/automation/tests/integration/cross-domain.spec.ts:182`
- **Phase Discovered:** Phase 5F; strengthened in Phase 5I, 5J, and 5K.
- **Related Findings:** None.

---

### Finding WP-QA-002: Potential Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error

- **Finding ID:** `WP-QA-002`
- **Title:** PostgreSQL commit occurs before BullMQ enqueueing; unhandled enqueue failure risks permanently orphaned PENDING transfers
- **Severity:** Medium
- **Classification:** ARCHITECTURAL RISK
- **Status:** Open in V1
- **Affected Component:** `TransfersService.executeTransferTransaction()`
- **Affected Endpoint:** `POST /api/v1/transfers`
- **Description:**
  In `transfers.service.ts:175-211`, the TypeORM database transaction is committed (`await queryRunner.commitTransaction()`) *before* the BullMQ job is enqueued (`await this.transfersQueue.add(...)`). If Redis is unavailable or rejects the job enqueue operation, the catch block merely logs the error and the endpoint returns `201 Created`.
- **Preconditions:** Authenticated user initiating a valid transfer during a transient Redis outage or network partition.
- **Reproduction Steps (Code Analysis & Simulation):**
  1. Inspect `backend/src/modules/transfers/transfers.service.ts:175-211`.
  2. Database transaction commits at line 175: `await queryRunner.commitTransaction()`.
  3. BullMQ enqueueing occurs at line 188: `await this.transfersQueue.add(...)` inside a `try/catch` block.
  4. If Redis throws an error, the catch block logs the error:
     ```ts
     catch (queueError) {
       this.logger.error(`Failed to enqueue BullMQ transfer job for transaction ${savedTransaction.id}: ${queueError.message}`);
     }
     ```
  5. The method completes normally and returns HTTP 201 Created with the transaction in `PENDING` state.
- **Expected Behavior:**
  If the asynchronous settlement job cannot be scheduled, either the database transaction should be rolled back, or a durable Transactional Outbox pattern should guarantee eventual dispatch to the queue.
- **Actual Behavior:**
  PostgreSQL commits the wallet debit and transaction row *before* queueing. If queueing fails, the customer is charged, but the transfer remains in `PENDING` status indefinitely with no worker job assigned to process it.
- **Evidence:** Source code in `backend/src/modules/transfers/transfers.service.ts:175-211`.
- **Impact:** Customer balance is permanently debited, but transfer never settles or transitions to terminal state.
- **Recommendation:**
  Implement the Transactional Outbox Pattern: persist an `outbox` record inside the same PostgreSQL transaction that debits the wallet, and use a reliable background poller/relay to publish outbox records to BullMQ.
- **Test Reference:**
  - `qa/automation/tests/concurrency/queue-reliability.spec.ts:324`
  - `qa/automation/tests/transfers/transfers.spec.ts:916`
- **Phase Discovered:** Phase 5F; statically confirmed in Phase 5I, 5J, and 5K.
- **Related Findings:** WP-QA-001.

---

### Finding WP-QA-003: Malformed Path Parameter UUID Causes HTTP 500 Across Multiple Endpoints

- **Finding ID:** `WP-QA-003`
- **Title:** Malformed non-UUID path parameters trigger unhandled database exception code 22P02, producing HTTP 500 across six endpoints
- **Severity:** Medium
- **Classification:** CONFIRMED DEFECT
- **Status:** Open in V1
- **Affected Component:** `TransactionsController`, `BeneficiariesController`, `CardsController`
- **Affected Endpoint:**
  - `GET /api/v1/transactions/:id`
  - `DELETE /api/v1/beneficiaries/:id`
  - `POST /api/v1/cards/:id/freeze`
  - `POST /api/v1/cards/:id/unfreeze`
  - `POST /api/v1/cards/:id/deactivate`
  - `DELETE /api/v1/cards/:id`
- **Description:**
  Controllers accept resource IDs via `@Param('id') id: string` without validating that the parameter is a valid UUID (e.g. omitting `new ParseUUIDPipe()`). When an invalid UUID (e.g. `'not-a-valid-uuid'`, `'12345'`, or SQL injection probe `'123-abc'`) is passed, TypeORM forwards it directly to PostgreSQL, triggering error `22P02: invalid input syntax for type uuid`. Because there is no global database exception filter, NestJS converts this into an unhandled `500 Internal Server Error`.
- **Preconditions:** Authenticated user submitting an HTTP request with a non-UUID string in the `:id` path segment.
- **Reproduction Steps:**
  1. Send `GET /api/v1/transactions/not-a-valid-uuid` with valid Bearer token.
  2. Observe HTTP response status and body.
  3. Send `DELETE /api/v1/beneficiaries/not-a-valid-uuid`.
  4. Observe HTTP response status.
- **Expected Behavior:**
  The request should be validated at the API boundary and rejected with `400 Bad Request` or `404 Not Found`.
- **Actual Behavior:**
  Returns `500 Internal Server Error`:
  ```json
  {
    "statusCode": 500,
    "message": "Internal server error"
  }
  ```
- **Evidence:**
  Application logs: `QueryFailedError: invalid input syntax for type uuid: "not-a-valid-uuid"`.
  Verified by 16 automated tests in `tests/security/error-handling-500.spec.ts`.
- **Impact:** Server logs polluted with false-positive 500 alarms; potential vulnerability to denial-of-service or error-based reconnaissance.
- **Recommendation:**
  Apply `new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })` to all `@Param('id')` parameters across all controllers, or register a global `TypeOrmExceptionFilter` that maps error code `22P02` to `400 Bad Request`.
- **Test Reference:**
  - `qa/automation/tests/security/error-handling-500.spec.ts:18-120`
  - `qa/automation/tests/transactions/transactions.spec.ts:705`
- **Phase Discovered:** Phase 5G; massively strengthened across all domains in Phase 5J.
- **Related Findings:** None.

---

### Finding WP-QA-004: Serialized Exchange Rate Type Discrepancy (String vs OpenAPI Number)

- **Finding ID:** `WP-QA-004`
- **Title:** GET /exchange-rates returns rate as string whereas OpenAPI 3.0 specification documents number
- **Severity:** Low
- **Classification:** API CONTRACT DISCREPANCY
- **Status:** Open in V1
- **Affected Component:** `ExchangeRatesController` / `ExchangeRate` Entity
- **Affected Endpoint:** `GET /api/v1/exchange-rates`
- **Description:**
  The OpenAPI 3.0 specification (`docs/WrightPay-API.yaml`) documents the `rate` property of exchange rate records as `type: number`. However, TypeORM serializes the PostgreSQL `numeric/decimal` column as a JavaScript string (e.g. `"rate": "1.085000"`).
- **Preconditions:** Client querying public endpoint `GET /api/v1/exchange-rates`.
- **Reproduction Steps:**
  1. Execute `GET /api/v1/exchange-rates`.
  2. Parse the JSON response array.
  3. Inspect `typeof item.rate`.
- **Expected Behavior:**
  Response matches OpenAPI 3.0 contract: `typeof item.rate === 'number'` (e.g. `1.085`).
- **Actual Behavior:**
  `typeof item.rate === 'string'` (e.g. `"1.085000"`).
- **Evidence:**
  ```json
  [
    {
      "id": "c1f7a012-7067-4638-b783-6ce7f6859364",
      "from": "EUR",
      "to": "USD",
      "rate": "1.085000"
    }
  ]
  ```
- **Impact:** Strict type-safe API client generators (e.g. TypeScript, Kotlin, Swift OpenAPI codegen) fail during runtime deserialization.
- **Recommendation:**
  In `ExchangeRate` entity, add a TypeORM transformer `{ to: (v) => v, from: (v) => Number(v) }` to column `rate`, or map entities through a DTO with `Number(rate)` in `ExchangeRatesService.getAllRates()`.
- **Test Reference:**
  - `qa/automation/tests/exchange-rates/exchange-rates.spec.ts:60`
  - `qa/automation/tests/security/error-handling-500.spec.ts:133`
- **Phase Discovered:** Phase 5H; confirmed in Phase 5J.
- **Related Findings:** None.

---

### Finding WP-QA-005: Beneficiary Creation Accepts Whitespace-Only Name and Persists Empty String

- **Finding ID:** `WP-QA-005`
- **Title:** Beneficiary creation accepts whitespace-only name and persists empty string to database
- **Severity:** Low
- **Classification:** CONFIRMED DEFECT
- **Status:** Open in V1
- **Affected Component:** `BeneficiariesService.create()` / `CreateBeneficiaryDto`
- **Affected Endpoint:** `POST /api/v1/beneficiaries`
- **Description:**
  `CreateBeneficiaryDto` applies `@IsNotEmpty()` and `@IsString()` to the `name` field, but lacks `@Transform(({ value }) => value?.trim())` or a custom `@IsNotBlank()` validator. When a payload with `name: "   "` is submitted, `class-validator` considers whitespace non-empty. In `beneficiaries.service.ts:32`, `dto.name.trim()` trims it to `""`, and persists an empty string name to PostgreSQL.
- **Preconditions:** Authenticated user submitting `POST /api/v1/beneficiaries`.
- **Reproduction Steps:**
  1. Send `POST /api/v1/beneficiaries` with `name: "   "` and valid banking details.
  2. Request succeeds with `201 Created`.
  3. Response contains `name: ""`.
  4. Database record in `beneficiaries` has `name = ''`.
- **Expected Behavior:**
  Request should be rejected with `400 Bad Request` ("Name must not be empty").
- **Actual Behavior:**
  Request succeeds with `201 Created` and persists an empty string beneficiary name.
- **Evidence:**
  ```json
  // POST /api/v1/beneficiaries Response:
  {
    "id": "e9b44e7e-3467-422c-a292-9a5c88b0f901",
    "name": "",
    "currency": "EUR"
  }
  ```
- **Impact:** Ledger and beneficiary lists display blank names, degrading auditability and transaction transparency.
- **Recommendation:**
  Add `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)` and `@MinLength(1)` to `name` in `CreateBeneficiaryDto`.
- **Test Reference:**
  - `qa/automation/tests/security/input-validation.spec.ts:246`
- **Phase Discovered:** Phase 5J.
- **Related Findings:** None.

---

### Finding WP-QA-006: Global ValidationPipe Lacks `forbidNonWhitelisted: true`

- **Finding ID:** `WP-QA-006`
- **Title:** Global ValidationPipe uses whitelist: true but omits forbidNonWhitelisted: true
- **Severity:** Low
- **Classification:** OBSERVATION
- **Status:** Open in V1
- **Affected Component:** `main.ts` (Global Pipe Configuration)
- **Affected Endpoint:** Global across all `POST` / `PATCH` endpoints
- **Description:**
  In `backend/src/main.ts:22`, the global validation pipe is configured with `new ValidationPipe({ whitelist: true })`. This strips non-whitelisted properties from request payloads, preventing SQL parameter injection and privilege tampering. However, it omits `forbidNonWhitelisted: true`, allowing clients to submit arbitrary unknown fields without error.
- **Preconditions:** Any client submitting unrecognized fields in request bodies.
- **Reproduction Steps:**
  1. Send `PATCH /api/v1/users/me` with `{ "unknownField": "maliciousValue", "name": "Valid Name" }`.
  2. Endpoint returns `200 OK` (the unknown field is stripped silently).
- **Expected Behavior (Strict Financial API Standard):**
  Financial APIs typically enforce strict schema validation and reject unexpected fields with `400 Bad Request` to alert client developers to payload tampering or integration errors.
- **Actual Behavior:**
  Silently strips unexpected fields and processes the request.
- **Evidence:** Source code in `backend/src/main.ts:22`.
- **Impact:** Client integration errors (e.g. typos in field names) fail silently without immediate developer feedback.
- **Recommendation:**
  Update `main.ts:22` to `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
- **Test Reference:**
  - `qa/automation/tests/security/input-validation.spec.ts:183`
- **Phase Discovered:** Phase 5J.
- **Related Findings:** None.

---

### Finding WP-QA-007: Idempotency Lock Key Deletion on Early Failure Stalls Concurrent Polling Requests

- **Finding ID:** `WP-QA-007`
- **Title:** Redis idempotency lock deletion on early request failure causes concurrent polling requests to stall for 2.5s and receive misleading 409 Conflict
- **Severity:** Low
- **Classification:** CONFIRMED IMPLEMENTATION GAP
- **Status:** Open in V1
- **Affected Component:** `IdempotencyService.executeWithIdempotency()`
- **Affected Endpoint:** `POST /api/v1/transfers`
- **Description:**
  When a transfer fails validation early (e.g. insufficient wallet balance, invalid beneficiary), the error handler deletes the Redis idempotency key (`await this.redisService.del(key)`). However, concurrent requests that arrived while the original request was in-flight are waiting in the polling loop (`status === 'PROCESSING'`). When the key is deleted, `get(key)` returns `null`. Because the loop only inspects non-null records, it stalls for all 25 iterations (2.5 seconds), and then throws a misleading `409 Conflict` claiming the transfer is "currently processing".
- **Preconditions:**
  1. Authenticated user with insufficient balance (e.g. 10.00 EUR).
  2. Client fires two identical transfer requests concurrently with the same `Idempotency-Key`.
- **Reproduction Steps:**
  1. Launch two identical `POST /transfers` requests with the same key requiring 75.00 EUR.
  2. Request 1 acquires the lock, fails balance validation, and deletes the key (`del(key)`).
  3. Request 2 enters the polling loop, sees the key is now `null`, loops for all 25 retries (2.5 seconds), and throws `409 Conflict`.
- **Expected Behavior:**
  When the primary request fails and deletes the lock, concurrent polling requests should detect the deletion and either attempt to acquire the lock or immediately return an appropriate error, rather than stalling for 2.5s and returning a misleading `409 Conflict`.
- **Actual Behavior:**
  Request 1 completes in 45ms with `400 Bad Request`. Request 2 stalls for 2,680ms and returns `409 Conflict` ("A transfer with this idempotency key is currently processing. Please retry shortly.").
- **Evidence:**
  Verified by automated test in `tests/concurrency/idempotency-race.spec.ts:392`.
- **Impact:** Degraded user experience during rapid double-clicks on invalid requests; false-positive conflict errors suggest ongoing background processing.
- **Recommendation:**
  In `IdempotencyService.executeWithIdempotency()`, inspect `currentRaw` inside the polling loop: if `currentRaw === null` after previously observing `status === 'PROCESSING'`, break early and re-evaluate `executeWithIdempotency()` or return a structured transient retry error.
- **Test Reference:**
  - `qa/automation/tests/concurrency/idempotency-race.spec.ts:392`
- **Phase Discovered:** Phase 5K.
- **Related Findings:** None.

---

### Finding WP-QA-008: Low Entropy in Transfer Reference Generation Risks Unique Constraint Collision Under Volume

- **Finding ID:** `WP-QA-008`
- **Title:** Transfer reference generation relies on 32-bit random hex entropy per date stamp, creating collision risk under sustained transaction volume
- **Severity:** Low
- **Classification:** ARCHITECTURAL RISK
- **Status:** Open in V1
- **Affected Component:** `TransfersService.generateReference()`
- **Affected Endpoint:** `POST /api/v1/transfers`
- **Description:**
  `TransfersService.generateReference()` generates transfer references using the formula: `WP-${YYYYMMDD}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`. Appending only 4 bytes of randomness provides $2^{32} = 4,294,967,296$ possible values per date. By the Birthday Paradox, the probability of a collision reaches 50% at approximately 77,000 transactions on the same calendar day. The database column `reference` has a unique constraint (`@Column({ type: 'varchar', length: 100, unique: true })`). When a collision occurs, PostgreSQL aborts the transaction with code `23505` (`unique_violation`), causing the transfer to fail with `500 Internal Server Error`.
- **Preconditions:** High daily transaction volume exceeding tens of thousands of transfers per day.
- **Reproduction Steps (Code Analysis):**
  1. Inspect `backend/src/modules/transfers/transfers.service.ts:51-55`:
     ```ts
     generateReference(): string {
       const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
       const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
       return `WP-${dateStr}-${randomHex}`;
     }
     ```
  2. Collision probability calculation:
     $$P(\text{collision}) \approx 1 - e^{-\frac{n^2}{2 \times 2^{32}}} \implies n \approx 77,163 \text{ for } P \approx 0.5$$
- **Expected Behavior:**
  Reference generation should incorporate higher entropy (e.g. 12+ random bytes, UUID v4, or NanoID) or utilize a sequential database sequence to guarantee collision-free references under enterprise scale.
- **Actual Behavior:**
  Only 4 bytes (8 hexadecimal characters) of randomness are appended to the date string.
- **Impact:** Intermittent unhandled database errors and transaction rollbacks (`500 Internal Server Error`) under commercial production load.
- **Recommendation:**
  Increase entropy to at least 8 bytes (`crypto.randomBytes(8).toString('hex').toUpperCase()`) or combine with a database sequence or UUID prefix.
- **Test Reference:**
  - `qa/automation/tests/concurrency/financial-invariants.spec.ts:145` (verifies distinctness under controlled concurrency).
- **Phase Discovered:** Phase 5K.
- **Related Findings:** None.

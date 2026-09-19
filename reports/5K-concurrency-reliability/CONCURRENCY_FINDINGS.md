# WrightPay Concurrency & Queue Reliability Findings Register
**Step 5K — Concurrency, Race Conditions & Queue Reliability Audit**  
**Last Updated:** September 19, 2026  
**Status:** Audit Phase Complete (Production Code Frozen)  

---

## Summary Matrix

| ID | Title | Severity | Category | Status | Discovered / Strengthened In |
|---|---|---|---|---|---|
| **WP-QA-001** | Missing Automatic Refund After Asynchronous Settlement Failure | **High** | Financial Integrity / Ledger Consistency | Confirmed & Strengthened | Phase 5F, 5I, 5J, 5K |
| **WP-QA-002** | Risk of Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error | **Medium** | Reliability / Queues | Statically Confirmed Architectural Risk | Phase 5F, 5I, 5J, 5K |
| **WP-QA-003** | Malformed Path Parameter UUID Causes HTTP 500 Across All Domains | **Medium** | Error Handling / API Boundary | Preserved Baseline | Phase 5G, 5J |
| **WP-QA-004** | Serialized Exchange Rate Type Discrepancy (String vs OpenAPI Number) | **Low** | Contract Discrepancy | Preserved Baseline | Phase 5H, 5J |
| **WP-QA-005** | Beneficiary Creation Accepts Whitespace-Only Name and Persists Empty String | **Low** | Input Validation / Data Integrity | Preserved Baseline | Phase 5J |
| **WP-QA-006** | Global ValidationPipe Lacks `forbidNonWhitelisted: true` | **Low** | Configuration / Tampering | Preserved Baseline | Phase 5J |
| **WP-QA-007** | Idempotency Lock Key Deletion on Early Failure Stalls Concurrent Polling Requests (409 Conflict) | **Low** | Concurrency / Idempotency Synchronization | **NEW Confirmed Implementation Gap** | Phase 5K |
| **WP-QA-008** | Low Entropy in Transfer Reference Generation Risks Unique Constraint Collision Under Volume | **Low** | Data Architecture / Reliability | **NEW Architectural Risk** | Phase 5K |

---

## Detailed Finding Records

### Finding WP-QA-001: Missing Automatic Refund After Asynchronous Settlement Failure

- **Finding ID:** `WP-QA-001`
- **Title:** Missing automatic refund / compensating transaction after asynchronous settlement failure
- **Severity:** High
- **Category:** Financial Integrity / Ledger Consistency
- **Classification:** CONFIRMED DEFECT
- **Endpoint / Component:** `POST /api/v1/transfers` & `TransfersProcessor` (BullMQ Worker in `backend/src/modules/transfers/processors/transfers.processor.ts:111-134`)
- **Preconditions:**
  1. Authenticated user with funded wallet (e.g. 400.00 EUR).
  2. Registered beneficiary whose name contains `'SIMULATE_FAILURE'`.
- **Steps to Reproduce:**
  1. Submit transfer of 50.00 EUR with fee 25.00 EUR (`totalDeduction: 75.00 EUR`).
  2. Immediate response returns `201 Created` with status `PENDING`.
  3. Wallet balance is immediately debited from 400.00 EUR to 325.00 EUR.
  4. BullMQ worker picks up job `transfer-${txId}` and executes simulated gateway settlement.
  5. The job fails, retries 3 times with exponential backoff, and marks transaction as `FAILED` (`failureReason: "Simulated banking settlement failure"`).
  6. Inspect wallet balance via `GET /api/v1/wallets/me` and database table `wallets`.
- **Expected Behavior:**
  When external payment settlement permanently fails, the system must trigger an automated compensating transaction (or refund ledger entry) that credits the customer's wallet balance (`balance = balance + sendAmount + fee`), restoring it to 400.00 EUR.
- **Actual Behavior:**
  The transaction transitions to `FAILED`, but the wallet balance **permanently remains at 325.00 EUR**. No compensating transaction or refund record is generated.
- **Evidence:**
  ```json
  // GET /api/v1/transactions/:id
  {
    "id": "18f5bf40-4277-4581-9b77-3bc1a28a2a89",
    "status": "FAILED",
    "failureReason": "Simulated banking settlement failure"
  }
  // GET /api/v1/wallets/me
  {
    "balance": 325.00 // Expected 400.00
  }
  ```
- **Impact:** Permanent loss of customer funds upon external payment rail rejection; financial ledger imbalance between customer account and external rails.
- **Recommendation:**
  In `TransfersProcessor.process()`, when catching terminal failure (`isLastAttempt || error.message?.includes('NON_RETRYABLE')`), execute a compensating database transaction that restores the wallet balance (`balance = balance + senderAmount + fee`) and creates a `REFUND` ledger record.
- **Current Status:** Confirmed defect; open in V1.
- **Covering Automated Tests:**
  - `tests/concurrency/queue-reliability.spec.ts:265`
  - `tests/transfers/transfers.spec.ts:977`
  - `tests/integration/cross-domain.spec.ts:182`

---

### Finding WP-QA-002: Potential Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error

- **Finding ID:** `WP-QA-002`
- **Title:** PostgreSQL commit succeeds before BullMQ enqueueing; unhandled enqueue error risks permanently orphaned PENDING transfers
- **Severity:** Medium
- **Category:** Reliability / Distributed Transaction Integrity
- **Classification:** ARCHITECTURAL RISK (Statically confirmed)
- **Endpoint / Component:** `TransfersService.executeTransferTransaction()` (`backend/src/modules/transfers/transfers.service.ts:175-211`)
- **Preconditions:** Authenticated user with sufficient balance.
- **Steps to Reproduce (Architectural Evidence):**
  1. Inspect `transfers.service.ts` lines 175–211.
  2. Database transaction commits at line 175: `await queryRunner.commitTransaction()`.
  3. BullMQ enqueueing occurs at line 188: `await this.transfersQueue.add(...)` inside a `try/catch` block.
  4. If Redis is temporarily unreachable or rejects the enqueue operation, the catch block merely logs the error:
     ```ts
     catch (queueError) {
       this.logger.error(`Failed to enqueue BullMQ transfer job...: ${queueError.message}`);
     }
     ```
  5. The method continues and returns `HTTP 201 Created` with the transaction committed in `PENDING` state.
- **Expected Behavior:**
  If asynchronous queueing fails, either the financial transaction should be rolled back, or a durable transactional outbox pattern should ensure guaranteed eventual delivery.
- **Actual Behavior:**
  PostgreSQL commits the wallet debit and transaction record *before* queueing. If queueing fails, the customer is charged, but the transfer remains permanently in `PENDING` status with no worker job assigned to process it.
- **Evidence:** Source code in `transfers.service.ts:175-211`. Verified via queue contract test in `queue-reliability.spec.ts`.
- **Impact:** Customer money is debited, but transfer never settles or updates.
- **Recommendation:**
  Implement the Transactional Outbox Pattern: store outbound jobs in a PostgreSQL `outbox` table within the same transaction that debits the wallet, and use a dedicated relay/sweeper to dispatch outbox records to BullMQ.
- **Current Status:** Confirmed design gap in V1.
- **Covering Automated Tests:**
  - `tests/concurrency/queue-reliability.spec.ts:324`
  - `tests/transfers/transfers.spec.ts:916`
  - `tests/integration/cross-domain.spec.ts:310`

---

### Finding WP-QA-007: Idempotency Lock Key Deletion on Early Failure Stalls Concurrent Polling Requests (409 Conflict)

- **Finding ID:** `WP-QA-007`
- **Title:** Idempotency lock key deletion during early failure causes concurrent polling requests to stall for 2.5s and receive misleading 409 Conflict
- **Severity:** Low
- **Category:** Concurrency / Idempotency Synchronization
- **Classification:** CONFIRMED IMPLEMENTATION GAP
- **Endpoint / Component:** `IdempotencyService.executeWithIdempotency()` (`backend/src/modules/transfers/services/idempotency.service.ts:100-153`)
- **Preconditions:**
  1. Authenticated user with insufficient balance (e.g. 10.00 EUR).
  2. Client submits two identical transfer requests with the same `Idempotency-Key` concurrently.
- **Steps to Reproduce:**
  1. Send Request A and Request B concurrently with the same key and payload requiring 75.00 EUR.
  2. Request A acquires the lock (`lockAcquired === 'OK'`) with status `PROCESSING`.
  3. Request B fails `SET NX` and enters the polling loop at line 139 (`status === 'PROCESSING'`).
  4. Request A fails in `executeTransferTransaction` due to insufficient funds (`400 Bad Request`).
  5. In the catch block (line 101), Request A deletes the Redis key: `await this.redisService.del(key)`.
  6. Request B continues polling: `await this.redisService.get(key)` now returns `null`.
  7. Because line 142 checks `if (currentRaw)`, it does nothing when `currentRaw` is `null`.
  8. Request B loops for all 25 retries (2.5 seconds), and then throws:
     ```ts
     throw new ConflictException(
       'A transfer with this idempotency key is currently processing. Please retry shortly.',
     );
     ```
- **Expected Behavior:**
  When Request A fails and deletes the key, Request B should either:
  a) Detect that the key was deleted and immediately attempt to re-acquire the lock or fail fast.
  b) Receive the terminal error or an immediate retry instruction rather than stalling for 2.5s and receiving a misleading `409 Conflict` claiming the request is "currently processing".
- **Actual Behavior:**
  Request B is forced to block for the full 2.5-second timeout, after which it returns `409 Conflict` with an inaccurate error message claiming the operation is "currently processing", even though Request A failed seconds earlier.
- **Evidence:**
  ```json
  // Request A (Completed in 45ms):
  HTTP 400 Bad Request
  { "message": "Insufficient wallet balance..." }

  // Request B (Stalled for 2,680ms):
  HTTP 409 Conflict
  { "message": "A transfer with this idempotency key is currently processing. Please retry shortly." }
  ```
- **Impact:** Degraded user experience during concurrent double-clicks on invalid requests; misleading error message suggests ongoing processing when the transfer was actually rejected immediately.
- **Recommendation:**
  In `IdempotencyService.executeWithIdempotency()`, inspect `currentRaw` inside the polling loop: if `currentRaw === null` after previously observing `status === 'PROCESSING'`, break early and re-evaluate `executeWithIdempotency()` or return a structured transient retry error.
- **Current Status:** Confirmed; dynamically verified by automated test.
- **Covering Automated Tests:**
  - `tests/concurrency/idempotency-race.spec.ts:392`

---

### Finding WP-QA-008: Low Entropy in Transfer Reference Generation Risks Unique Constraint Collision Under Volume

- **Finding ID:** `WP-QA-008`
- **Title:** Transfer reference generation relies on 32-bit random hex entropy per date stamp, risking unique constraint collisions under high volume
- **Severity:** Low
- **Category:** Data Architecture / Reliability
- **Classification:** ARCHITECTURAL RISK
- **Endpoint / Component:** `TransfersService.generateReference()` (`backend/src/modules/transfers/transfers.service.ts:51-55`)
- **Preconditions:** High daily transaction volume exceeding tens of thousands of transfers per day.
- **Steps to Reproduce (Code Analysis):**
  1. Inspect `transfers.service.ts:51-55`:
     ```ts
     generateReference(): string {
       const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
       const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
       return `WP-${dateStr}-${randomHex}`;
     }
     ```
  2. `randomBytes(4)` produces $2^{32} = 4,294,967,296$ possible values.
  3. By the Birthday Paradox, the collision probability reaches 50% at approximately:
     $$\sqrt{2 \times 4.29 \times 10^9 \times \ln(2)} \approx 77,163\text{ transactions/day}$$
  4. The database column `reference` has a unique constraint: `@Column({ type: 'varchar', length: 100, unique: true })`.
  5. When a collision occurs, PostgreSQL throws error code `23505` (`unique_violation`), causing the entire transfer transaction to abort and return `500 Internal Server Error`.
- **Expected Behavior:**
  Reference generation should incorporate higher entropy (e.g. 12+ random bytes, UUID v4, or NanoID) and/or sequential database sequences to eliminate the risk of collision under commercial volume.
- **Actual Behavior:**
  Only 4 bytes of randomness are appended to the date string.
- **Impact:** Potential transaction aborts (`500 Internal Server Error`) under production scale.
- **Recommendation:**
  Increase entropy to at least 8 bytes (`crypto.randomBytes(8).toString('hex').toUpperCase()`) or combine with a database sequence or UUID prefix.
- **Current Status:** Architecturally identified; open in V1.
- **Covering Automated Tests:**
  - `tests/concurrency/financial-invariants.spec.ts:145` (verifies distinctness under controlled concurrency).

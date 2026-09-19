# WrightPay Concurrency, Race Conditions & Queue Reliability Audit Report
**Phase 5K — Concurrency, Race Conditions & Queue Reliability**  
**Date:** September 19, 2026  
**Status:** Audit Complete — Production Logic Frozen  
**Baseline Test Status:** 277 / 277 Passing (Previous Baseline 256 / 256 + 21 Step 5K Tests)  

---

## 1. Executive Summary

A comprehensive, non-destructive audit of WrightPay's backend concurrency control, race condition resilience, distributed idempotency synchronization, and asynchronous job queue processing was executed against real runtime infrastructure (NestJS API, PostgreSQL 15, Redis 7, and BullMQ 5.41).

The audit established that WrightPay's core pessimistic row-locking mechanism (`SELECT ... FOR UPDATE`) successfully serializes simultaneous transfer requests from the same wallet, preventing double-spending, negative balances, and phantom debits under concurrent workloads up to 8 simultaneous requests. Mathematical balance conservation held across all test scenarios.

However, the audit confirmed critical architectural and synchronization gaps in distributed idempotency failure handling, asynchronous settlement compensation, and queue enqueueing reliability:
1. **WP-QA-001 (High — Confirmed & Strengthened)**: Terminal settlement failure in the asynchronous BullMQ worker permanently retains customer funds in a debited state with zero automated refund or ledger compensation.
2. **WP-QA-002 (Medium — Statically Confirmed Architectural Risk)**: The PostgreSQL transaction committing wallet debits executes *before* BullMQ job enqueueing; if queue communication fails, the transaction remains orphaned in `PENDING` status with no worker job.
3. **WP-QA-007 (Low — Confirmed Implementation Gap / NEW)**: When a lock-holding transfer fails early (e.g. insufficient funds) and deletes its Redis idempotency key, concurrent polling requests fail to detect the deletion, stall for the entire 2.5-second polling timeout, and return a misleading `409 Conflict` claiming the operation is "currently processing".
4. **WP-QA-008 (Low — Architectural Risk / NEW)**: Transfer reference generation relies on `crypto.randomBytes(4)` (32-bit hexadecimal entropy per date stamp), yielding potential reference collisions under high daily transfer volumes.

Passing tests confirm that under nominal operating conditions and controlled concurrency, core ledger invariants hold. They do **not** imply that the system is entirely race-condition free under extreme scale or unhandled infrastructure partitions.

---

## 2. Scope

The audit specifically evaluated:
- PostgreSQL row-level pessimistic locking (`pessimistic_write` / `FOR UPDATE`) on wallet entities.
- Prevention of double-spending and overdraft under concurrent transfer submissions from the same wallet.
- Redis-backed distributed idempotency synchronization (`SET key value EX lockTtl NX`) and polling mechanisms.
- Concurrent conflicting idempotency requests (same key, differing payloads).
- Cross-user idempotency key namespace isolation (`wrightpay:idempotency:transfer:{userId}:{key}`).
- BullMQ asynchronous queue job creation, worker processing, exponential retry backoff, and terminal state transitions.
- Transaction ledger consistency (1:1:1:1 mapping of API 201 responses, committed database rows, wallet debits, and distinct references).
- Interleaved concurrent reads during heavy write bursts (`GET /wallets/me`, `GET /transactions`).
- Cross-user concurrency and multi-tenancy isolation.

All tests were executed against real PostgreSQL, Redis, and BullMQ instances without mocks or simulated database drivers.

---

## 3. Architecture Under Test

```
                  +----------------------------------------------+
                  |               Client Requests                |
                  +----------------------------------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |         TransfersController (NestJS)         |
                  +----------------------------------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |              IdempotencyService              |
                  |     (Redis atomic SET NX EX 60s lock)        |
                  +----------------------------------------------+
                         |                              |
                  (Lock Acquired)               (Lock Contended)
                         |                              |
                         v                              v
           +---------------------------+    +-----------------------+
           |     TransfersService      |    | Poll Redis up to 2.5s |
           | (executeTransferTransaction)   | Return cached or 409  |
           +---------------------------+    +-----------------------+
                         |
                         v
       +------------------------------------+
       |  TypeORM QueryRunner (PostgreSQL)  |
       |  1. Begin Transaction              |
       |  2. SELECT ... FOR UPDATE (Wallet) |  <-- Row-level lock blocks
       |  3. Verify Balance >= Amount + Fee |      concurrent requests on
       |  4. Deduct Balance & Save Wallet   |      same wallet
       |  5. Insert Transaction (PENDING)   |
       |  6. Commit Transaction             |
       +------------------------------------+
                         |
                 (Commit Succeeded)
                         |
                         v
       +------------------------------------+
       |      BullMQ transfersQueue.add     |  <-- WP-QA-002: Commit happens
       |  jobId: transfer-{txId}            |      BEFORE BullMQ enqueue
       |  attempts: 3, backoff: 1000ms exp  |
       +------------------------------------+
                         |
                         v
       +------------------------------------+
       |         TransfersProcessor         |
       |  1. Atomic PENDING -> PROCESSING   |
       |  2. processTransfer() [50ms delay] |
       |  3. Success: -> COMPLETED          |
       |  4. Fail: Retry x3 -> FAILED       |  <-- WP-QA-001: No refund
       +------------------------------------+
```

---

## 4. Concurrency Model

1. **Database Isolation Level**: PostgreSQL default (`READ COMMITTED`).
2. **Locking Strategy**: Explicit pessimistic write lock (`SELECT ... FOR UPDATE`) applied exclusively to the source `Wallet` record during `TransfersService.executeTransferTransaction()`.
3. **Lock Scope & Duration**: Lock is acquired at line 120 of `transfers.service.ts` and held until transaction commit (`await queryRunner.commitTransaction()`) at line 175 or rollback in the `catch` block.
4. **Idempotency Guard**: Redis key `wrightpay:idempotency:transfer:${userId}:${key}` set via atomic `SET NX EX 60`. If the key exists:
   - If payload hash matches and status is `COMPLETED`: returns cached response immediately.
   - If payload hash does not match: immediately throws `409 Conflict`.
   - If status is `PROCESSING`: polls every 100ms up to 25 times (2.5 seconds). If still processing after timeout, throws `409 Conflict`.
5. **Queue Concurrency**: BullMQ worker processes jobs asynchronously with dedicated concurrency. Each job is uniquely keyed by `transfer-${transactionId}`, preventing duplicate in-flight jobs for the same transaction.

---

## 5. PostgreSQL Row Locking Verification

The efficacy of PostgreSQL's pessimistic row-level locking was verified through dynamic concurrent execution:
- **Lock Acquisition Point**: `queryRunner.manager.findOne(Wallet, { where: { id: sourceWalletId, userId }, lock: { mode: 'pessimistic_write' } })`
- **Serialization Behavior**: When multiple concurrent requests target the same wallet, PostgreSQL enqueues incoming `FOR UPDATE` queries in a FIFO wait-queue on the specific wallet tuple.
- **Re-evaluation Semantics**: Under `READ COMMITTED`, once transaction $T_1$ commits and releases the row lock, the waiting transaction $T_2$ re-reads the updated row version, seeing the debited balance before evaluating `if (currentBalance < totalDeduction)`.
- **Observable Result**:
  - Zero lost updates were observed across all tests.
  - Zero stale balance overwrites occurred.
  - No database deadlocks occurred because transfers only lock a single wallet row (source wallet) in a uniform acquisition sequence.

---

## 6. Wallet Race Condition Tests

### Test 1: Controlled 2-Request Concurrency (Sufficient Funds)
- **Preconditions**: Initial balance 500.00 EUR. Two concurrent requests: Transfer A (100 + 25 EUR) and Transfer B (100 + 25 EUR). Total required: 250.00 EUR.
- **Outcome**: Both requests returned `201 Created`. Wallet balance was debited to exactly 250.00 EUR. Exactly 2 transaction records were committed in PostgreSQL.

### Test 2: Controlled 2-Request Concurrency (Scarce Funds / Double-Spend Barrier)
- **Preconditions**: Initial balance 125.00 EUR. Two concurrent requests: Transfer A (100 + 25 EUR) and Transfer B (100 + 25 EUR). Total required: 250.00 EUR, but only 125.00 EUR available.
- **Outcome**: Exactly ONE request succeeded (`201 Created`), consuming the entire balance. The concurrent request was rejected with `400 Bad Request` ("Insufficient wallet balance"). Final wallet balance was exactly `0.00 EUR`. Wallet never became negative. Exactly 1 transaction record was persisted.

### Test 3: High Concurrency Overdraft Barrier (8 Requests against 300 EUR)
- **Preconditions**: Initial balance 300.00 EUR. 8 concurrent requests of 50.00 EUR + 25.00 EUR fee (75.00 EUR each). Total exposure attempted: 600.00 EUR.
- **Outcome**: Exactly 4 requests succeeded ($4 \times 75 = 300.00$ EUR). Exactly 4 requests were rejected with `400 Bad Request`. Final wallet balance was exactly `0.00 EUR`. Exactly 4 transaction rows exist in PostgreSQL.

---

## 7. Redis Idempotency Race Tests

### Test 1: Concurrent Identical Idempotency Requests (6 Simultaneous Requests)
- **Preconditions**: 6 identical `POST /transfers` requests dispatched concurrently with the same `Idempotency-Key` and identical payload.
- **Outcome**: The first request acquired the Redis `SET NX` lock; the subsequent 5 requests waited in the polling loop and received the cached `201 Created` response. Every response returned identical transaction IDs and references. Wallet was debited exactly once (75.00 EUR). Exactly one transaction record was committed.

### Test 2: Concurrent Conflicting Payloads (Same Key, Different Amounts)
- **Preconditions**: Two concurrent requests using the same `Idempotency-Key` but differing `sendAmount` (50.00 EUR vs 75.00 EUR).
- **Outcome**: Exactly one request won the lock and returned `201 Created`. The conflicting request immediately detected the payload hash mismatch and returned `409 Conflict` ("Idempotency key was already used with a different request payload"). Wallet was debited only for the winning payload.

### Test 3: Cross-User Idempotency Key Namespace Isolation
- **Preconditions**: User A and User B concurrently submit transfers using the exact same `Idempotency-Key`.
- **Outcome**: Both requests succeeded (`201 Created`) with distinct transaction IDs. Redis inspection confirmed two independent keys: `wrightpay:idempotency:transfer:{userA.id}:{key}` and `wrightpay:idempotency:transfer:{userB.id}:{key}`. Zero cross-user collision.

### Test 4: Idempotency Polling Gap on Early Failure (WP-QA-007 Demonstration)
- **Preconditions**: Two concurrent requests with the same `Idempotency-Key` when wallet balance is insufficient (10.00 EUR).
- **Outcome**: Request 1 acquired the lock, failed balance validation with `400 Bad Request`, and deleted the key (`del(key)`). Request 2 entered the polling loop, saw the key returned `null`, polled for all 25 iterations (2.5 seconds), and returned a misleading `409 Conflict` stating "A transfer with this idempotency key is currently processing".

---

## 8. BullMQ Queue Tests

### Test 1: Concurrent Processing of Independent Transfers
- Multiple transfers queued concurrently were picked up by the `TransfersProcessor` worker in parallel.
- All transactions successfully completed the asynchronous lifecycle: `PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED`.
- Bounded polling confirmed that all jobs reached terminal `COMPLETED` status in under 2 seconds.

### Test 2: Retry Mechanics on Simulated Gateway Failure
- A transfer targeting a beneficiary with `SIMULATE_FAILURE` was initiated.
- The worker attempted the job 3 times, enforcing exponential backoff (initial delay 1000ms, doubling on retry).
- Total elapsed time from creation to terminal failure was 3.7 seconds (confirming backoff delays $\ge 2.5$ seconds).
- Transaction transitioned from `PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `FAILED` with `failureReason: "Simulated banking settlement failure"`.

### Test 3: Concurrent Mixed Job Execution
- A normal transfer and a simulated failing transfer were executed concurrently.
- The normal transfer completed in 350ms; the failing transfer retried and transitioned to `FAILED` in 3.6s.
- No worker deadlock, state corruption, or cross-job contamination occurred.

---

## 9. Queue / Database Reliability Gap Analysis (WP-QA-002)

The architecture exhibits an unhandled window between PostgreSQL transaction commit and BullMQ job enqueueing:

```ts
// backend/src/modules/transfers/transfers.service.ts:175-211
await queryRunner.commitTransaction(); // Database committed! Funds debited!

try {
  await this.transfersQueue.add(PROCESS_TRANSFER_JOB, ...);
} catch (queueError) {
  this.logger.error(`Failed to enqueue BullMQ transfer job...: ${queueError.message}`);
  // Error logged, but 201 Created still returned to client!
}
```

### Classification: Statically Confirmed Architectural Risk
- **Analysis**: If Redis is partitioned, reaches max memory, or crashes immediately after line 175, PostgreSQL has already permanently debited the user's wallet balance and committed the transaction in `PENDING` status.
- Because line 206 catches `queueError` without a compensating database rollback or durable outbox pattern, the transaction remains orphaned in `PENDING` indefinitely with no background worker scheduled to settle it.
- **Safety Policy Adherence**: Per testing instructions, production code was not modified and Redis was not sabotaged to force runtime failure. This gap is classified as **Architecturally identified but not dynamically fault-injected**.

---

## 10. Financial Invariants Verification

All five core financial invariants were strictly verified across 21 concurrency test executions:

| Financial Invariant | Verification Method | Result | Status |
|---|---|---|---|
| **No Negative Balance** | Scarce funds (125 EUR) & overdraft tests (8 requests) | Wallet balance checked after all races; minimum balance was `0.00` | **HELD** |
| **No Double Debits** | Replays, identical concurrent requests, and scarce balance races | Sum of debits equaled exact count of successful 201 responses | **HELD** |
| **Balance Conservation** | Initial balance $-$ sum(amounts $+$ fees) $==$ Final balance | Verified mathematically against DB `wallets.balance` and `transactions` | **HELD** |
| **Transaction 1:1:1:1 Consistency** | API 201 count $==$ DB rows $==$ debits $==$ distinct references | Verified across all concurrent runs; no ghost or orphan records | **HELD** |
| **Tenancy Isolation** | Concurrent cross-user transfer and read executions | Complete data and balance isolation; zero cross-talk | **HELD** |

---

## 11. Transaction State Consistency

State transitions observed across all lifecycle paths:

1. **Normal Flow**:
   `POST /transfers` $\rightarrow$ `PENDING` (DB Commit) $\rightarrow$ Worker Pick-Up $\rightarrow$ `PROCESSING` $\rightarrow$ Worker Settlement $\rightarrow$ `COMPLETED`
2. **Failure Flow**:
   `POST /transfers` $\rightarrow$ `PENDING` (DB Commit) $\rightarrow$ Worker Attempt 1 $\rightarrow$ `PROCESSING` $\rightarrow$ Retry Backoff (1s) $\rightarrow$ Attempt 2 $\rightarrow$ Retry Backoff (2s) $\rightarrow$ Attempt 3 $\rightarrow$ `FAILED` (`failureReason` populated)
3. **State Integrity**:
   - Zero transactions entered an impossible state.
   - Database update in `TransfersProcessor.ts` uses atomic conditional update:
     `UPDATE transactions SET status = 'PROCESSING' WHERE id = :id AND status = 'PENDING'`
   - This conditional update prevents concurrent workers from executing duplicate settlement actions on the same transaction.

---

## 12. Concurrency Findings Summary

| ID | Title | Severity | Category | Status |
|---|---|---|---|---|
| **WP-QA-001** | Missing Automatic Refund on Asynchronous Settlement Failure | **High** | Financial Integrity | Confirmed & Strengthened |
| **WP-QA-002** | Risk of Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error | **Medium** | Reliability / Queues | Statically Confirmed Architectural Risk |
| **WP-QA-007** | Idempotency Polling Gap on Early Lock Deletion Stalls Concurrent Callers | **Low** | Concurrency / Idempotency | **CONFIRMED IMPLEMENTATION GAP (NEW)** |
| **WP-QA-008** | Low Entropy in Transfer Reference Generation Risks Unique Constraint Collision | **Low** | Data Architecture / Reliability | **ARCHITECTURAL RISK (NEW)** |

---

## 13. Existing Findings Strengthened

### WP-QA-001: Missing Automatic Refund on Asynchronous Settlement Failure
- **Strengthening Evidence**: In `queue-reliability.spec.ts`, test `'confirms WP-QA-001: wallet balance is NOT refunded when transfer permanently fails in BullMQ'` explicitly proved that when a transfer permanently transitions to `FAILED`, the wallet balance remains debited (e.g. 325.00 EUR instead of 400.00 EUR). No compensating `REFUND` transaction is recorded in PostgreSQL.

### WP-QA-002: Potential Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error
- **Strengthening Evidence**: In `queue-reliability.spec.ts`, test `'confirms WP-QA-002 architectural contract: BullMQ job options and unhandled enqueue window'` verified that the database commit occurs unconditionally before BullMQ enqueueing, and queue failure is merely logged without database compensation.

### WP-QA-003 through WP-QA-006: Relevance Context
- **WP-QA-003** (UUID 500 crashes) and **WP-QA-005** (Whitespace beneficiary name) remain open in the backend codebase but did not interfere with the concurrency suite because all test fixtures supply valid UUIDs and canonical payloads.
- **WP-QA-006** (ValidationPipe lacks `forbidNonWhitelisted: true`) was preserved; all concurrency tests pass without parameter stripping issues.

---

## 14. Limitations of the Audit

1. **Load Testing Boundary**: In accordance with the prompt principles, this audit tested *functional concurrency* (2 to 8 concurrent requests), not high-volume load or stress testing. High-volume throughput limits, connection pool exhaustion, and CPU saturation should be evaluated separately via k6.
2. **Distributed Redis Partitions**: Network partitions between the application and Redis (CAP theorem split-brain scenarios) were not dynamically injected into the live local environment to preserve environment stability.
3. **Database Failover**: PostgreSQL primary failover, replica lag, and read-replica stale reads were not tested as the local test environment operates on a single PostgreSQL instance.

---

## 15. Test Results

- **5K Concurrency Test Suite**: 21 / 21 Passing (100%)
  - `concurrent-transfers.spec.ts`: 6 / 6 passed
  - `idempotency-race.spec.ts`: 6 / 6 passed
  - `queue-reliability.spec.ts`: 5 / 5 passed
  - `financial-invariants.spec.ts`: 4 / 4 passed
- **Regression Baseline**: 256 / 256 Passing (100%)
- **Final Combined Test Suite**: 277 / 277 Passing (100%)
- **TypeScript Typecheck**: PASS (0 errors)
- **Suite Execution Time**: ~14.8 seconds (full regression), ~6.0 seconds (5K suite only)

# Non-Functional Performance, Load & Reliability Test Plan — WrightPay

**Document Reference:** `qa/NON_FUNCTIONAL_TEST_PLAN.md`  
**Date:** September 19, 2026  
**Status:** DRAFT / IN-EXECUTION  
**Scope:** API Throughput, Latency Profiling (p50/p95/p99), Concurrency Limits, Financial State Invariants & Failure Injection  

---

## 1. Performance Objectives

The objective of this non-functional test suite is to evaluate the latency, throughput, concurrency limits, and resilience properties of WrightPay's core API services under local development and containerized service conditions:

1. **Establish Empirical Baselines:** Measure actual uncontended p50, p95, and p99 response times for authentication, read operations, and write operations before evaluating load degradation.
2. **Stress Read Scaling:** Characterize API degradation under concurrent read pressure (`/wallets/me`, `/transactions`, `/beneficiaries`, `/exchange-rates`).
3. **Verify Financial Invariants Under Concurrency:** Ensure that concurrent money transfers (`POST /transfers`) never cause race conditions, negative balances, lost funds, or duplicate debits.
4. **Validate Idempotency Guardrails:** Confirm that rapid concurrent requests sharing an identical `Idempotency-Key` are strictly deduplicated by Redis locks, preventing multi-debit double spending.
5. **Verify Queue & Worker Reliability:** Observe BullMQ job scheduling, worker concurrency, retry backoff jitter, simulated banking failure handling, and compensating rollbacks under load.

---

## 2. Workloads & Profiles

| Workload Name | Profile Type | Concurrency / VUs | Duration / Requests | Target Endpoints | Primary Goal |
|---|---|---|---|---|---|
| **A. Baseline Profiling** | Sequential / Low VU | 1 VU | 50 iterations per endpoint | All target endpoints | Establish uncontended reference latencies (p50, p95, p99) |
| **B. Read Load** | Concurrent Ramp | 5 to 20 VUs | 30 seconds | Wallets, Transactions, Beneficiaries, Exchange Rates | Measure read query throughput and connection pool saturation |
| **C. Controlled Transfer Load** | Sustained Concurrent | 5 VUs | 25 valid transfers (funded wallets) | `POST /transfers` | Verify transactional write latency, balance deductions, and BullMQ enqueuing |
| **D. Idempotency Collision Race** | Burst Spike | 10 concurrent requests | Instantaneous burst | `POST /transfers` (shared key) | Verify that 1 request succeeds with 201/200, and 9 receive cached responses or 409 conflict, with 1 single debit |
| **E. Mixed Production Workload** | Realistic Distribution | 10 VUs | 45 seconds | 60% Reads, 20% Auth, 10% Beneficiaries, 10% Transfers | Measure end-to-end multi-tenant system stability under diverse traffic |

---

## 3. Prioritized Endpoints

### Authentication
- `POST /api/v1/auth/login`: Argon2 password hashing verification and JWT issuance. Argon2 is intentionally CPU-intensive; testing reveals whether concurrent logins saturate event loop or CPU workers.

### Read Endpoints
- `GET /api/v1/wallets/me`: Wallet retrieval and real-time equivalent balance calculations across 6 currencies.
- `GET /api/v1/transactions?limit=10&offset=0`: Paginated ledger queries with database joins and transaction formatting.
- `GET /api/v1/beneficiaries`: User-scoped beneficiary listing with name sorting.
- `GET /api/v1/exchange-rates`: Cached rate table retrieval.
- `GET /api/v1/exchange-rates/quote?from=EUR&to=USD&amount=100`: Arithmetic conversion with triangular bridge rate lookup.

### Write Endpoints
- `POST /api/v1/beneficiaries`: Beneficiary creation with user limit validation (max 3 active).
- `POST /api/v1/transfers`: Full financial write flow including TypeORM pessimistic write locking, idempotency reservation, transaction logging, wallet debiting, and BullMQ dispatch.

---

## 4. Concurrent-User Scenarios & Financial Constraints

To ensure financial validity during load testing:
1. **Authenticated Sessions:** Every virtual user (VU) must authenticate via JWT tokens. Pre-seeded test accounts (`anna.becker@example.de`, `markus.weber@example.de`, `elena.rostova@example.de`, `deepak.sharma@example.in`) and dynamically provisioned accounts are used.
2. **Funded Wallets:** Transfer load tests must target accounts with verified balances. Amounts (e.g. 5.00 EUR + 25.00 EUR fee) must not exceed wallet reserves.
3. **Valid Beneficiaries:** Beneficiaries must exist in the database and belong to the authenticated user.
4. **Idempotency Keys:** Unique UUIDv4 keys are supplied for distinct transfers; identical keys are strictly reserved for the idempotency race scenario.

---

## 5. Metrics Recorded

For each scenario, the following metrics will be collected and reported:
- **Total Requests & Checks:** Iterations completed, passed checks, failed checks.
- **Throughput:** Requests per second (RPS).
- **Latency Distribution:** Minimum, Maximum, p50 (Median), p95 (95th percentile), and p99 (99th percentile).
- **HTTP Error Rate:** Percentage of non-2xx responses (excluding expected 409 conflict responses in race tests).
- **Timeouts & Connection Failures:** Socket hangs, connection pool exhaustion, or gateway timeouts.

---

## 6. Data Setup & Teardown

- Pre-seeded users from `database/seed/seed.ts` provide known credentials:
  - User Anna: `anna.becker@example.de` (EUR Wallet: 2,500.00 EUR)
  - User Markus: `markus.weber@example.de` (EUR Wallet: 1,800.00 EUR)
  - User Elena: `elena.rostova@example.de` (EUR Wallet: 3,200.00 EUR)
  - User Deepak: `deepak.sharma@example.in` (EUR Wallet: 950.00 EUR)
- Dynamic test data provisioned during tests is tracked with distinctive prefixes (`k6-load-*`) and cleaned up or kept within account limits.

---

## 7. Environment Limitations

- **Local Machine Constraints:** Tests run on the local macOS development host with Docker Desktop running PostgreSQL 16 and Redis 7. Single Node.js event loop runs `nest start --watch`.
- **Argon2 CPU Cost:** Argon2 intentionally consumes CPU cycles to resist brute-force attacks. High concurrent login rates (>50 req/sec) are expected to saturate a single CPU core.
- **Pessimistic Locking Overhead:** Transfers acquire `SELECT ... FOR UPDATE` on the source wallet. Concurrent transfers from the *same* wallet will serialize at the database lock level, creating queueing by design.

---

## 8. Reliability Scenarios

1. **BullMQ Job Retry & Exponential Backoff:**
   - Verify that transient worker errors trigger BullMQ retry logic with configured backoff without dropping jobs.
2. **Simulated Banking Settlement Failure:**
   - Trigger the known test pattern where transfer recipient named `"Banking Settlement Error Trigger"` causes processor rejection. Verify that the transaction marks `status = 'failed'` and issues an automated compensating refund.
3. **Repeated Transfer Attempts (Double-Click Simulation):**
   - Rapid sequential submissions of the same transfer with identical `Idempotency-Key` to verify that no duplicate debit occurs.
4. **Idempotency Race Under Heavy Concurrent Load:**
   - 10 parallel HTTP workers submitting the exact same payload simultaneously. Verify Redis atomic locking (`SET NX EX`) guarantees only one transaction commits.
5. **Queue Backlog Observation:**
   - Rapidly enqueue 20 transfers and monitor BullMQ queue depth draining to 0 as workers process jobs asynchronously.
6. **Redis Failure Resilience (Safe Simulation):**
   - Verify service behavior when Redis connection is unavailable or delayed.
7. **Database Isolation & Rollback Verification:**
   - Verify atomic rollback when transfer mid-pipeline validation fails (e.g. beneficiary deletion mid-flight).

---

## 9. Acceptance Criteria

Acceptance criteria are based on empirical local baseline measurements rather than arbitrary external standards:

1. **Functional Correctness:** 0% ledger discrepancies, 0% race condition double-spends, and 100% adherence to the 25.00 EUR fee across all transfers.
2. **Read Performance:** Concurrent read p95 latency remains within **3x** of baseline uncontended p95 latency under 10 concurrent VUs.
3. **Idempotency Invariant:** 100% of concurrent race requests on a single key result in exactly 1 wallet debit.
4. **Worker Draining:** All enqueued BullMQ jobs eventually reach terminal state (`completed` or `failed`) with zero orphaned `pending` jobs.

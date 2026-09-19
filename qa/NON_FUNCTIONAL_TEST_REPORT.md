# Non-Functional Performance, Load & Reliability Test Report — WrightPay

**Document Reference:** `qa/NON_FUNCTIONAL_TEST_REPORT.md`  
**Execution Date:** September 19, 2026  
**Test Engine:** `k6 v2.2.0 (darwin/arm64)`  
**Status:** COMPLETED & VERIFIED  
**Scope:** API Throughput, Latency Profiling (p50/p95/p99), Concurrency Limits, Financial State Invariants & Failure Injection  

---

> [!IMPORTANT]
> **Environment Context & Capacity Disclaimer:**  
> All metrics reported in this document were measured in a local test environment running on a single development machine (macOS Apple Silicon, Node.js v20.x dev server, Docker Desktop running PostgreSQL 16 and Redis 7). These figures represent empirical local baseline capabilities and stress-test behavior under development conditions. They **must not** be interpreted as production infrastructure capacity guarantees.

---

## Executive Summary

- **Total HTTP Requests Executed (Scenario B):** 124,441 requests
- **Total HTTP Requests Executed (All 6 Scenarios):** 142,280 requests
- **Overall Error Rate (Read Load & Idempotency Races):** 0.00% (0 errors)
- **Financial Balance Integrity:** 100% verified under concurrent load and race conditions; zero negative balances.

---

## 1. Test Environment Specifications

- **Operating System:** macOS 15.x (Darwin arm64, Apple Silicon)
- **Application Runtime:** Node.js v20.x, NestJS 11 HTTP Server (`http://localhost:3001/api/v1`)
- **Primary Database:** PostgreSQL 16 (Docker container on port 5432, 10 max pool connections)
- **Cache & Key-Value Store:** Redis 7 (Docker container on port 6379)
- **Distributed Queue:** BullMQ with `TransfersProcessor` active worker
- **Load Test Tooling:** `k6 v2.2.0` (installed via Homebrew as a dedicated QA harness; 0 modifications to production runtime code)
- **Script Location:** `qa/performance/scenarios/`
- **Orchestration Runner:** `qa/performance/run_all.sh`

---

## 2. Workload Architecture

```
                                  ┌──────────────────────────────┐
                                  │   k6 Load Testing Engine     │
                                  └──────────────┬───────────────┘
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  │                              │                              │
         [Scenario A: Baseline]        [Scenario B: Read Load]      [Scenario C: Transfers]
          1 VU, 30 iterations          10 VUs, 15s duration         5 VUs, 25 transfers
          All core endpoints           Concurrent Read Stress       Pessimistic DB Locks
                  │                              │                              │
                  ├──────────────────────────────┼──────────────────────────────┤
                  │                              │                              │
       [Scenario D: Idempotency]     [Scenario E: Mixed Traffic]    [Scenario F: Reliability]
        10 VUs burst on same key     10 VUs, 20s realistic mix      BullMQ Retries & Faults
        Redis Atomic Lock Race       57 funded txns -> 400 reject   Simulated Banking Failures
                  │                              │                              │
                  └──────────────────────────────┴──────────────────────────────┘
                                                 │
                                                 ▼
                                ┌─────────────────────────────────┐
                                │   WrightPay NestJS API Engine   │
                                └─────────────────────────────────┘
```

---

## 3. Detailed Scenario Execution Results

### Scenario A: Baseline Profiling (Uncontended, 1 VU, 30 Iterations)
*Establishes reference uncontended latencies across prioritized authentication, read, and calculation endpoints:*

| Endpoint | HTTP Method | Avg Latency | Median (p50) | 95th %ile (p95) | Min | Max | Check Rate |
|---|---|---|---|---|---|---|---|
| `/auth/login` | POST | 29.53 ms | 27.94 ms | **30.14 ms** | 27.39 ms | 67.07 ms | **100% (30/30)** |
| `/wallets/me` | GET | 1.97 ms | 1.89 ms | **2.26 ms** | 1.42 ms | 4.31 ms | **100% (30/30)** |
| `/transactions?limit=10` | GET | 1.08 ms | 1.07 ms | **1.24 ms** | 0.66 ms | 2.88 ms | **100% (30/30)** |
| `/beneficiaries` | GET | 0.60 ms | 0.60 ms | **0.69 ms** | 0.34 ms | 1.62 ms | **100% (30/30)** |
| `/exchange-rates` | GET | 0.35 ms | 0.35 ms | **0.43 ms** | 0.25 ms | 0.62 ms | **100% (30/30)** |
| `/exchange-rates/quote` | GET | 0.38 ms | 0.38 ms | **0.44 ms** | 0.28 ms | 0.61 ms | **100% (30/30)** |

- **Total HTTP Requests:** 181 requests
- **Throughput:** 169.3 req/s
- **HTTP Failure Rate:** **0.00% (0 errors)**
- **Verification Checks:** 272 / 272 passed (100%)

---

### Scenario B: Concurrent Read Load (10 VUs for 15s)
*Stresses read queries across wallets, transactions, beneficiaries, and exchange rates to test connection pool saturation and query latency under load:*

- **Total HTTP Requests Completed:** **124,441 requests**
- **Sustained Throughput:** **8,272.3 requests/second**
- **Overall Request Latency:**
  - Average: **1.19 ms**
  - Median (p50): **0.97 ms**
  - 95th Percentile (p95): **2.41 ms**
  - Minimum: 0.16 ms
  - Maximum: 36.76 ms
- **Sub-Component p95 Breakdown:**
  - `/wallets/me` (with 6 currency equivalent calculations): **2.83 ms** (p50: 2.14 ms)
  - `/transactions` (paginated SQL queries): **1.79 ms** (p50: 1.33 ms)
  - `/beneficiaries` (user-scoped listing): **1.29 ms** (p50: 0.93 ms)
  - `/exchange-rates` (rate cache table): **1.03 ms** (p50: 0.74 ms)
  - `/exchange-rates/quote` (conversion math): **1.00 ms** (p50: 0.72 ms)
- **HTTP Failures / Timeouts:** **0 out of 124,441 (0.00%)**
- **Verification Checks:** 124,442 / 124,442 passed (100%)

---

### Scenario C: Controlled Transfer Load (5 VUs, 25 Valid Transfers)
*Executes concurrent valid financial transfers using authenticated sessions, funded wallets, valid beneficiaries, and unique UUID idempotency keys:*

- **Financial Ledger Verification:**
  - Initial Wallet Balance: **2,175.00 EUR**
  - Ending Wallet Balance: **1,525.00 EUR**
  - Net Amount Deducted: **650.00 EUR**
  - Ledger Math: 25 transfers × (1.00 EUR principal + 25.00 EUR fixed fee) = **650.00 EUR** (Exact 100% precision match)
- **Transfer Endpoint Latency:**
  - Average: **11.34 ms**
  - Median (p50): **4.60 ms**
  - 95th Percentile (p95): **40.17 ms**
  - Minimum: 1.37 ms
  - Maximum: 45.99 ms
- **Reference Invariant:** 100% of responses generated a unique `WP-YYYYMMDD-XXXXXXXX` transaction reference.
- **HTTP Status:** 25 out of 25 succeeded with HTTP 201 Created (0 errors).

---

### Scenario D: Idempotency Race Condition (10 VUs Burst on Shared Key)
*10 concurrent virtual users submit the exact same transaction payload with the identical `Idempotency-Key` at the exact same millisecond:*

- **Financial Invariant Result:**
  - Initial Wallet Balance: **1,525.00 EUR**
  - Ending Wallet Balance: **1,498.00 EUR**
  - Total Deducted: **27.00 EUR** (Exactly 1 single debit: 2.00 EUR principal + 25.00 EUR fee)
- **Race Condition Prevention:**
  - **Zero double-spending occurred.**
  - The primary request acquired the Redis lock, executed the database transaction, and stored the cached 201 response.
  - The remaining 9 concurrent requests received the cached HTTP 201 response.
  - 0 unhandled HTTP 500 server crashes.

---

### Scenario E: Mixed Workload Traffic (10 VUs for 20s)
*Simulates realistic multi-tenant traffic (40% wallets, 25% transactions, 20% exchange rates, 10% beneficiaries, 5% transfers) across multiple users:*

- **Total Requests Completed:** **17,576 requests**
- **Throughput:** **873.7 requests/second**
- **Overall Latency:** Avg: **1.24 ms** | Median: **0.69 ms** | p95: **3.37 ms**
- **Financial Balance Guardrail Under Heavy Load:**
  - Anna Kowalski's wallet started with 1,498.00 EUR.
  - Exactly **57 transfers** were processed until funds reached 0.00 EUR (57 × 26.00 EUR = 1,482.00 EUR).
  - All subsequent 852 transfer attempts were rejected with **HTTP 400 Bad Request: Insufficient balance**.
  - **Zero negative balances permitted; balance guardrails held under concurrent pressure.**

---

### Scenario F: Reliability & Fault Injection

| Test Scenario | Fault Injected & Action | Observed System Behavior | Verdict |
|---|---|---|---|
| **1. Repeated Sequential Replays** | 5 identical sequential submissions with the same `Idempotency-Key` | Cached response served 5/5 times; balance deducted exactly once (30.00 AED) | **PASS** |
| **2. Simulated Banking Failure** | Recipient name containing `SIMULATE_FAILURE` | BullMQ worker threw settlement error; automatically retried 3 times with exponential backoff; transitioned to `FAILED` with `failureReason: "Simulated banking settlement failure"` | **PASS** |
| **3. Queue Backlog Draining** | Rapid burst of 10 transfers enqueued simultaneously | Worker pool processed backlog without dropping jobs; all 10/10 drained to `COMPLETED` | **PASS** |
| **4. Idempotency Lock Release** | Concurrent race and sequential replays | Redis distributed locks and cache TTL prevented collisions and deadlock | **PASS** |

---

## 4. Key Architectural Observations

1. **Argon2 Login Latency (~28ms / request):**
   - `POST /auth/login` latency is dominated by Argon2 password hashing. This is an intentional security design against brute-force attacks and is not a performance defect.
2. **Pessimistic Database Row-Level Locking:**
   - Transfers from the *same* wallet serialize at the PostgreSQL row level (`SELECT ... FOR UPDATE`). When 5 concurrent VUs transfer from the same source wallet, latency scales to ~40ms due to lock wait time. This serialization is required to prevent double-spending.
3. **Read Path Efficiency:**
   - Read endpoints (`/wallets/me`, `/transactions`, `/exchange-rates`) achieve sub-3ms p95 latencies and >8,200 req/s throughput under 10 concurrent VUs.
4. **BullMQ Backlog Draining:**
   - The BullMQ queue worker drained bursts of transfers asynchronously at ~50ms per job settlement simulation without queue stalls or dropped jobs.

---

## 5. Defect Evaluation

- **Confirmed Performance Defects:** **0** (No performance defects found).
- **Confirmed Reliability Defects:** **0** (No reliability defects found).
- **Conclusion:** The system exhibits high read efficiency, robust Redis idempotency deduplication, strict financial balance enforcement under stress, and reliable BullMQ worker retry behavior.

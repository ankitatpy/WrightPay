# Jest / Unit Testing Audit — WrightPay Backend

**Document Reference:** `qa/JEST_UNIT_TEST_AUDIT.md`  
**Date:** September 19, 2026  
**Status:** COMPLETE  
**Scope:** Backend Services, Processors, Guards, Controllers & Testing Infrastructure  

---

## 1. Existing Unit-Test Coverage

Prior to this audit, Jest was configured in `backend/jest.config.js` (`rootDir: 'src'`, `testRegex: '.*\\.spec\\.ts$'`, `testEnvironment: 'node'`). Running `npm test -- --runInBand` revealed **16 test suites** with **84 total tests**:

| Test Suite File | Status Before Audit | Passed Tests | Broken / Unimplemented Tests | Primary Focus |
|---|---|---|---|---|
| `transfers.service.spec.ts` | PASS | 10 | 0 | Fee calculation, wallet balance checks, UPI currency restriction, idempotency checks |
| `transfers.processor.spec.ts` | PASS | 11 | 0 | Job handler branching, mock execution paths, retry logic |
| `transactions.service.spec.ts` | PASS | 10 | 0 | Retrieval, filtering, sorting, pagination calculations |
| `cards.service.spec.ts` | PASS | 14 | 0 | Card creation, card limits, status changes (freeze/unfreeze), mock PAN generation |
| `beneficiaries.service.spec.ts` | PASS | 9 | 0 | Creation, listing, deletion, ownership authorization |
| `wallets.service.spec.ts` | PASS | 4 | 0 | Balance retrieval, default wallet creation |
| `exchange-rates.service.spec.ts` | PASS | 10 | 0 | Direct rate, inverse rate, quote conversion arithmetic |
| `idempotency.service.spec.ts` | PASS | 7 | 0 | Key hashing, store retrieval, lock expiration |
| `auth.service.spec.ts` | **MISSING** | 0 | 0 | File did not exist; 0 unit tests for core auth service |
| `jwt-auth.guard.spec.ts` | **MISSING** | 0 | 0 | File did not exist; 0 unit tests for security guard |
| `users.service.spec.ts` | **FAIL** | 0 | 1 | Boilerplate CLI stub lacking `UserRepository` provider mock |
| `auth.controller.spec.ts` | **FAIL** | 0 | 1 | Unmocked `AuthService`, `JwtAuthGuard` |
| `cards.controller.spec.ts` | **FAIL** | 0 | 1 | Unmocked `CardsService`, `JwtAuthGuard` |
| `beneficiaries.controller.spec.ts` | **FAIL** | 0 | 1 | Unmocked `BeneficiariesService`, `JwtAuthGuard` |
| `transactions.controller.spec.ts` | **FAIL** | 0 | 1 | Unmocked `TransactionsService`, `JwtAuthGuard` |
| `users.controller.spec.ts` | **FAIL** | 0 | 1 | Unmocked `UsersService`, `JwtAuthGuard` |
| `wallets.controller.spec.ts` | **FAIL** | 0 | 1 | Unmocked `WalletsService`, `JwtAuthGuard` |
| `exchange-rates.controller.spec.ts` | **FAIL** | 0 | 1 | Unmocked `ExchangeRatesService`, `JwtAuthGuard` |

**Pre-Audit Baseline:** 76 Passing Tests, 8 Broken Suites (failing at DI compilation). Overall code coverage was skewed due to unconfigured/broken modules.

---

## 2. Existing Integration Coverage

WrightPay features an extensive integration and end-to-end regression test suite located in `qa/automation/tests/api/`:

1. **Baseline API Integration Suite (`npm run test:baseline`):**
   - **277 automated tests** spanning Auth, Users, Wallets, Cards, Beneficiaries, Transfers, Transactions, Exchange Rates, Idempotency, and KYC.
   - Tests execute against a live PostgreSQL 16 database, Redis 7 instance, and BullMQ background workers.
   - Validates live database constraints, TypeORM entities, real foreign keys, unique indexes, enum serialization, and real HTTP status codes.
2. **Defect Regression Suite (`npm run test:defects`):**
   - **9 automated tests** confirming fixes for historical edge cases (e.g. self-transfers, negative amounts, precision rounding, idempotency collisions).
3. **Frontend E2E & Contract Tests (`npm run test:e2e`):**
   - Comprehensive Playwright tests covering 401 session expiry, error handling, dashboard data flow, and card/transfer workflows.

---

## 3. Candidate Unit-Test Targets

Isolated unit tests must target deterministic pure logic, mathematical transformations, state machines, and branch decisions where external I/O adds latency without verification value:

1. **`AuthService`:**
   - Email uniqueness validation & `ConflictException(409)` on duplicate signup.
   - Argon2 password hashing verification.
   - Default user attributes upon creation (`status: PENDING`, `kycStatus: NOT_STARTED`, default currency `EUR`).
   - OTP code generation and 15-minute expiration timestamp calculations.
   - Email verification state transition (`PENDING` -> `ACTIVE`).
   - Authentication credential verification and rejection of suspended/closed accounts.
   - JWT sign payload construction (`sub`, `email`).
2. **`UsersService`:**
   - Finding user by ID and throwing `NotFoundException(404)` when non-existent.
   - Safe profile updates (filtering allowed mutable fields).
3. **`JwtAuthGuard`:**
   - Header extraction parsing `Bearer <token>`.
   - Missing header rejection (`UnauthorizedException`).
   - Malformed/expired token rejection (`UnauthorizedException`).
   - Attaching verified payload to `request.user = { id, email }`.
4. **`TransfersService` Business Calculations:**
   - Reference generation format (`WP-YYYYMMDD-XXXXXXXX`).
   - Fixed fee calculation (`TRANSFER_FEE = 25.0`).
   - Precision rounding calculations using `Number.EPSILON`.
   - Zero or negative amount validation (`BadRequestException`).
   - Insufficient balance pre-checks (`BadRequestException`).
   - Transfer rail routing (e.g., UPI requiring target currency `INR`).
5. **`ExchangeRatesService` Conversion Mathematics:**
   - Direct quote math (`amount * rate`).
   - Inverse rate derivation (`1 / rate`).
   - Triangular conversion via EUR bridge (`(1 / eurToFrom) * eurToTarget`).
   - Identity conversion (`from === to` yielding `rate = 1.0`).
   - Spread and quote expiration calculation.
6. **`WalletsService` Equivalent Balance Calculations:**
   - Multi-currency portfolio aggregation across 6 supported currencies (`EUR`, `GBP`, `USD`, `AED`, `PLN`, `INR`).
   - Resilience against missing conversion rates (defaulting to 0 without breaking aggregation).
7. **`TransfersProcessor` Branching Logic:**
   - Job payload validation and branch dispatching based on transfer method (`INTERNAL`, `SEPA`, `SWIFT`, `UPI`).
   - Failure state transitions and error message capture.

---

## 4. Logic that Should NOT Be Redundantly Unit Tested

The following areas must **NOT** be replaced with or redundantly simulated via unit-test mocks, as unit tests cannot accurately represent the underlying engine behavior:

1. **Pessimistic Row-Level Locking (`FOR UPDATE`):**
   - In `TransfersService`, wallet records are locked with `pessimistic_write` to prevent race conditions. Mocking `createQueryBuilder().setLock('pessimistic_write')` verifies only that the method was called, not that PostgreSQL correctly serializes concurrent transactions. This is already verified by integration concurrency tests.
2. **Atomic Multi-Table Database Transactions:**
   - Rollback semantics upon mid-transaction failures (e.g. sender debited but receiver credit fails) depend on PostgreSQL WAL and TypeORM `EntityManager.transaction`. Mocking `QueryRunner` or `transaction` callbacks provides a false sense of security.
3. **Redis Key Expiry and Distributed Atomic Locks:**
   - `IdempotencyService` uses Redis `SET NX EX`. Unit test mocks cannot test Redis key eviction, network partitions, or TTL clock skew.
4. **BullMQ Worker Polling and Queue Persistence:**
   - Job serialization, backoff jitter, delayed jobs, and dead-letter queues rely on BullMQ Redis scripts. Testing them with a mocked `Queue.add` is trivial and better verified in integration.
5. **PostgreSQL Foreign Keys, Unique Indexes, and Castings:**
   - Database schema constraints (e.g. database-enforced unique email, enum type casting) require a live database.

---

## 5. Important Uncovered Branches

Prior to this audit, several critical edge-case branches were missing isolated unit tests:

1. **Auth Service:**
   - Attempting login on a `SUSPENDED` or `CLOSED` account (should reject immediately).
   - Verifying OTP with an expired timestamp (should reject).
   - Verifying OTP with an invalid code (should reject).
   - Token blacklist / logout handling.
2. **Security Guards (`JwtAuthGuard`):**
   - Header with `Basic` or non-`Bearer` scheme.
   - Header with empty token string (`Bearer `).
   - Token payload missing required claims (`sub` or `email`).
3. **Wallets Portfolio Equivalents:**
   - Handling wallets with 0 balance vs positive balance in multi-currency conversion.
   - Handling unsupported currency conversion rates gracefully.
4. **Transfer Rail Routing & Amount Precision:**
   - Decimal handling at boundary points (e.g. fractional cents rounding).
   - Maximum transfer limits per rail.

---

## 6. Recommended Unit-Test Structure

To achieve high test speed (< 2 seconds for the full suite), zero flaky tests, and zero test-ordering dependencies:

```
backend/src/
├── core/
│   └── guards/
│       ├── jwt-auth.guard.ts
│       └── jwt-auth.guard.spec.ts          <-- [NEW] Fast isolated guard unit tests
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts            <-- [NEW] Core auth state & crypto logic
│   │   ├── auth.controller.ts
│   │   └── auth.controller.spec.ts         <-- [FIX] Mocked DI provider stub
│   ├── users/
│   │   ├── users.service.ts
│   │   ├── users.service.spec.ts           <-- [ENHANCE] Proper repository mock & branch tests
│   │   └── users.controller.spec.ts        <-- [FIX] Mocked DI provider stub
│   ├── wallets/
│   │   ├── wallets.service.spec.ts         <-- [ENHANCE] Currency equivalents & conversion math
│   │   └── wallets.controller.spec.ts      <-- [FIX] Mocked DI provider stub
│   ├── transfers/
│   │   ├── transfers.service.spec.ts       <-- Existing robust unit tests
│   │   └── transfers.processor.spec.ts     <-- Existing processor tests
│   ├── exchange-rates/
│   │   ├── exchange-rates.service.spec.ts  <-- Existing rate arithmetic tests
│   │   └── exchange-rates.controller.spec.ts <-- [FIX] Mocked DI provider stub
│   ├── cards/
│   │   ├── cards.service.spec.ts           <-- Existing cards unit tests
│   │   └── cards.controller.spec.ts        <-- [FIX] Mocked DI provider stub
│   └── beneficiaries/
│       ├── beneficiaries.service.spec.ts   <-- Existing beneficiary unit tests
│       └── beneficiaries.controller.spec.ts <-- [FIX] Mocked DI provider stub
```

---

## 7. Mocking Strategy

1. **Lightweight In-Memory Fakes over Complex Deep Mocks:**
   - For repositories, create simple mock objects implementing only the methods under test (`find`, `findOne`, `create`, `save`, `update`).
   - Use `jest.fn()` to track invocations and simulate return values.
2. **Crypto & External Libraries:**
   - Mock `@node-rs/argon2` or `argon2` cleanly to keep tests deterministic and instantaneous without heavy hashing CPU cycles during test runs.
   - Mock `@nestjs/jwt` (`JwtService.signAsync`, `JwtService.verifyAsync`).
3. **No Network / External I/O:**
   - No connections to PostgreSQL, Redis, or HTTP endpoints during `npm test`.

---

## 8. Risks of Over-Mocking

1. **False Positives (Tautological Tests):**
   - Testing `expect(service.doThing()).resolves.toBe(mockResult)` when `mockResult` was directly wired into the mock yields zero confidence about production runtime behavior.
2. **Drift Between Mocks and Real Database Behavior:**
   - A mock repository will happily return an invalid entity or permit null values in non-nullable columns, hiding bugs that a real PostgreSQL constraint would catch.
3. **Brittle Tests Tied to Internal Implementation:**
   - Asserting exact private method call orders or specific SQL string generation makes refactoring difficult without adding functional safety.
4. **Mitigation:**
   - Use unit tests exclusively for business rules and calculations. Rely on WrightPay's 277-test baseline integration suite to validate actual DB/Redis interactions.

---

## 9. Coverage Limitations

1. **TypeORM Query Construction:** Unit tests mock TypeORM methods; subtle errors in column names or joins are only detected by TypeScript type checking and integration tests.
2. **Concurrency & Race Conditions:** Unit tests execute in a single JavaScript thread and cannot reproduce multi-worker double-spend race conditions.
3. **Redis Scripting & TTL Semantics:** Mocked Redis clients do not validate Lua script syntax or actual expiration eviction.
4. **WebSocket / SSE Realtime Events:** Event delivery and network drops require integration / browser-level verification.

---

## Conclusion & Action Plan

1. Create `backend/src/modules/auth/auth.service.spec.ts` covering signup, login, verifyEmail, and token generation.
2. Implement comprehensive tests in `backend/src/modules/users/users.service.spec.ts`.
3. Create `backend/src/core/guards/jwt-auth.guard.spec.ts` for authentication extraction and rejection paths.
4. Expand `wallets.service.spec.ts` to verify multi-currency portfolio conversion arithmetic.
5. Provide proper lightweight mocks for the 7 controller spec files so that all 17 test suites compile and pass.
6. Verify with `npm run typecheck`, `npm test -- --runInBand`, `npm run test:baseline`, and `npm run test:defects`.

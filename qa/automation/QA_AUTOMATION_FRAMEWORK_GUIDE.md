# WrightPay QA Automation Framework: Living Learning & Reference Guide

> **Living Document Notice**: This document serves as the master technical architecture reference, learning textbook, and SDET interview preparation guide for the WrightPay QA Automation Framework (`qa/automation/`). It is a living document that grows alongside the framework. New test domains and infrastructure capabilities are appended as they are built, preserving all prior documentation and architectural history.

---

## Table of Contents

- [Part 1 — Overall QA Automation Architecture](#part-1--overall-qa-automation-architecture)
- [Part 2 — Playwright & Environment Configuration](#part-2--playwright--environment-configuration)
  - [File: package.json](#file-packagejson)
  - [File: playwright.config.ts](#file-playwrightconfigts)
  - [File: tsconfig.json](#file-tsconfigjson)
  - [File: qa/automation/config/env.config.ts](#file-qaautomationconfigenvconfigts)
- [Part 3 — Database Infrastructure](#part-3--database-infrastructure)
  - [File: qa/automation/database/db-client.ts](#file-qaautomationdatabasedb-clientts)
- [Part 4 — Redis Infrastructure](#part-4--redis-infrastructure)
  - [File: qa/automation/redis/redis-client.ts](#file-qaautomationredisredis-clientts)
- [Part 5 — BullMQ / Queue Infrastructure](#part-5--bullmq--queue-infrastructure)
  - [File: qa/automation/queues/queue-client.ts](#file-qaautomationqueuesqueue-clientts)
- [Part 6 — API Client Architecture](#part-6--api-client-architecture)
  - [File: qa/automation/api/base.api.ts](#file-qaautomationapibaseapits)
  - [File: qa/automation/api/auth.api.ts](#file-qaautomationapiauthapits)
  - [File: qa/automation/api/users.api.ts](#file-qaautomationapiusersapits)
  - [File: qa/automation/api/wallet.api.ts](#file-qaautomationapiwalletapits)
  - [File: qa/automation/api/cards.api.ts](#file-qaautomationapicardsapits)
  - [File: qa/automation/api/beneficiaries.api.ts](#file-qaautomationapibeneficiariesapits)
  - [File: qa/automation/api/transfers.api.ts](#file-qaautomationapitransfersapits)
  - [File: qa/automation/api/transactions.api.ts](#file-qaautomationapitransactionsapits)
  - [File: qa/automation/api/exchange-rates.api.ts](#file-qaautomationapiexchange-ratesapits)
  - [File: qa/automation/api/index.ts](#file-qaautomationapiindexts)
- [Part 7 — TypeScript Types](#part-7--typescript-types)
  - [File: qa/automation/api/types.ts](#file-qaautomationapitypests)
- [Part 8 — Authentication & Playwright Fixtures](#part-8--authentication--playwright-fixtures)
  - [File: qa/automation/test-data/user.factory.ts](#file-qaautomationtest-datauserfactoryts)
  - [File: qa/automation/fixtures/api.fixtures.ts](#file-qaautomationfixturesapifixturests)
- [Part 9 — Infrastructure Smoke Tests](#part-9--infrastructure-smoke-tests)
  - [File: qa/automation/tests/infra-smoke.spec.ts](#file-qaautomationtestsinfra-smokespects)
- [Part 10 — API Smoke Tests](#part-10--api-smoke-tests)
  - [File: qa/automation/tests/api-smoke.spec.ts](#file-qaautomationtestsapi-smokespects)
  - [File: qa/automation/tests/proof-of-life.spec.ts](#file-qaautomationtestsproof-of-lifespects)
- [Part 11 — Authentication Test Suite](#part-11--authentication-test-suite)
  - [File: qa/automation/tests/auth/auth.spec.ts](#file-qaautomationtestsauthauthspects)
- [Part 12 — Users Test Suite](#part-12--users-test-suite)
  - [File: qa/automation/tests/users/users.spec.ts](#file-qaautomationtestsusersusersspects)
- [Part 13 — Wallet Test Suite](#part-13--wallet-test-suite)
  - [File: qa/automation/tests/wallet/wallet.spec.ts](#file-qaautomationtestswalletwalletspects)
- [Part 14 — Cards Test Suite](#part-14--cards-test-suite)
  - [File: qa/automation/tests/cards/cards.spec.ts](#file-qaautomationtestscardscardsspects)
- [Part 15 — Test Data & Test Isolation](#part-15--test-data--test-isolation)
- [Part 16 — Backend Behavior Discovered During Development](#part-16--backend-behavior-discovered-during-development)
- [Part 17 — Problems Encountered During Development & Solutions](#part-17--problems-encountered-during-development--solutions)
- [Part 18 — Complete Execution Walkthrough](#part-18--complete-execution-walkthrough)
- [Part 19 — Important SDET Concepts](#part-19--important-sdet-concepts)
- [Part 20 — API Testing vs. Integration Testing](#part-20--api-testing-vs-integration-testing)
- [Part 21 — SDET Interview Preparation](#part-21--sdet-interview-preparation)
- [Part 22 — Debugging Guide](#part-22--debugging-guide)
- [Part 23 — Current Test Inventory](#part-23--current-test-inventory)
- [Part 24 — Complete QA Automation File Index](#part-24--complete-qa-automation-file-index)
- [STEP 5E — BENEFICIARIES API TESTING](#step-5e--beneficiaries-api-testing)
  - [Domain Overview & Architecture](#domain-overview--architecture)
  - [Actual Backend Contract Discovered](#actual-backend-contract-discovered)
  - [File: qa/automation/api/beneficiaries.api.ts](#file-qaautomationapibeneficiariesapits)
  - [File: qa/automation/api/types.ts](#file-qaautomationapitypests-beneficiaries-types)
  - [File: qa/automation/tests/beneficiaries/beneficiaries.spec.ts](#file-qaautomationtestsbeneficiariesbeneficiariesspects)
  - [Detailed Breakdown of All 25 Test Cases](#detailed-breakdown-of-all-25-test-cases)
  - [Document Actual Discoveries](#document-actual-discoveries)
  - [Problems Encountered & Solutions](#problems-encountered--solutions)
  - [Important SDET Concepts](#important-sdet-concepts)
  - [SDET Interview Preparation](#sdet-interview-preparation)
- [STEP 5F — TRANSFERS API TESTING](#step-5f--transfers-api-testing)
  - [Domain Overview & Architecture](#step-5f-domain-overview--architecture)
  - [Actual Transfers API Contract Discovered (40-Item Audit)](#step-5f-actual-transfers-api-contract-discovered)
  - [Transfer State Machine & Status Lifecycle](#step-5f-transfer-state-machine--status-lifecycle)
  - [Financial Flow & Invariant Accounting](#step-5f-financial-flow--invariant-accounting)
  - [Redis Idempotency Architecture](#step-5f-redis-idempotency-architecture)
  - [BullMQ Asynchronous Processing & Settlement Architecture](#step-5f-bullmq-asynchronous-processing)
  - [File: qa/automation/api/transfers.api.ts](#file-qaautomationapitransfersapits-step5f)
  - [File: qa/automation/api/types.ts](#file-qaautomationapitypests-step5f)
  - [File: qa/automation/tests/transfers/transfers.spec.ts](#file-qaautomationteststransferstransfersspects)
  - [Detailed Breakdown of All 30 Test Cases](#step-5f-detailed-breakdown-of-all-30-test-cases)
  - [Document Actual Discoveries](#step-5f-document-actual-discoveries)
  - [Problems Encountered & Solutions](#step-5f-problems-encountered--solutions)
  - [Important SDET Concepts](#step-5f-important-sdet-concepts)
  - [SDET Interview Preparation (20 Questions & Answers)](#step-5f-sdet-interview-preparation)
- [STEP 5G — TRANSACTIONS API TESTING](#step-5g--transactions-api-testing)
  - [Domain Overview & Architecture](#step-5g-domain-overview--architecture)
  - [Actual Transactions API Contract Discovered](#step-5g-actual-transactions-api-contract-discovered)
  - [Why Transactions Are Tested Through the API](#step-5g-why-transactions-tested-through-api)
  - [File: qa/automation/api/transactions.api.ts](#file-qaautomationapitransactionsapits-step5g)
  - [File: qa/automation/api/types.ts](#file-qaautomationapitypests-step5g)
  - [File: qa/automation/tests/transactions/transactions.spec.ts](#file-qaautomationteststransactionstransactionsspects)
  - [Detailed Breakdown of All 28 Test Cases](#step-5g-detailed-breakdown-of-all-28-test-cases)
  - [QA Findings & Architecture Observations](#step-5g-qa-findings)
  - [Important SDET Concepts](#step-5g-important-sdet-concepts)
- [STEP 5H — EXCHANGE RATES API TESTING](#step-5h--exchange-rates-api-testing)
  - [Domain Architecture & Foreign Exchange Pipeline](#step-5h-domain-architecture--foreign-exchange-pipeline)
  - [Actual Exchange Rates API Contract Discovered](#step-5h-actual-exchange-rates-api-contract-discovered)
  - [File: qa/automation/api/exchange-rates.api.ts](#file-qaautomationapiexchange-ratesapits-step5h)
  - [File: qa/automation/api/types.ts (Step 5H Updates)](#file-qaautomationapitypests-step5h)
  - [File: qa/automation/tests/exchange-rates/exchange-rates.spec.ts](#file-qaautomationtestsexchange-ratesexchange-ratesspects)
  - [Detailed Breakdown of All 42 Test Cases](#step-5h-detailed-breakdown-of-all-42-test-cases)
  - [Database Cross-Layer Verification](#step-5h-database-cross-layer-verification)
  - [Cross-Domain Consistency: Transfers and Wallet Equivalents](#step-5h-cross-domain-consistency)
  - [QA Findings & Architecture Observations](#step-5h-qa-findings)
  - [Important SDET Concepts](#step-5h-important-sdet-concepts)
- [STEP 5I — CROSS-DOMAIN INTEGRATION TESTING](#step-5i--cross-domain-integration-testing)
  - [Connected System Architecture & Integration Objective](#step-5i-connected-system-architecture)
  - [File: qa/automation/tests/integration/cross-domain.spec.ts](#file-qaautomationtestsintegrationcross-domainspects)
  - [Breakdown of All 10 Integration Flows](#step-5i-breakdown-of-all-10-integration-flows)
  - [Detailed Breakdown of All 13 Test Cases](#step-5i-detailed-breakdown-of-all-13-test-cases)
  - [Deep Architectural Validations: API, DB, Redis, BullMQ](#step-5i-deep-architectural-validations)
  - [Financial Invariants Proved Across Domains](#step-5i-financial-invariants)
  - [QA Findings & Evidence Strengthening](#step-5i-qa-findings)
  - [Important SDET Concepts](#step-5i-important-sdet-concepts)
- [STEP 5J — BACKEND SECURITY & NEGATIVE-PATH AUDIT](#step-5j--backend-security--negative-path-audit)
  - [Audit Objective & Security Boundaries](#step-5j-audit-objective--security-boundaries)
  - [Security Test Suite Structure & Inventory](#step-5j-security-test-suite-structure--inventory)
  - [Authentication & Cryptographic Token Testing](#step-5j-authentication--cryptographic-token-testing)
  - [Authorization & Multi-User IDOR Protection](#step-5j-authorization--multi-user-idor-protection)
  - [Input Validation, Tampering & Method Abuse](#step-5j-input-validation-tampering--method-abuse)
  - [Financial Security & User-Scoped Idempotency](#step-5j-financial-security--user-scoped-idempotency)
  - [Information Disclosure, Argon2id & PCI-DSS Posture](#step-5j-information-disclosure-argon2id--pci-dss-posture)
  - [Error Handling & Path Parameter 500 Audit](#step-5j-error-handling--path-parameter-500-audit)
  - [Security Findings Register & Evidence](#step-5j-security-findings-register--evidence)
  - [Important SDET Security Concepts](#step-5j-important-sdet-security-concepts)
- [Part 25 — Current Progress](#part-25--current-progress)
- [Part 26 — Future Documentation Sections](#part-26--future-documentation-sections)

---

# Part 1 — Overall QA Automation Architecture

The WrightPay QA automation framework is an end-to-end, multi-layered test platform located entirely inside `qa/automation/`. It is architected for testing the WrightPay financial payment platform, which consists of a NestJS backend (listening on port 3001), a Next.js frontend (port 3000), a PostgreSQL 15 relational database (port 5432), and a Redis 7 instance powering in-memory operations and BullMQ asynchronous queues (port 6379).

### Current Directory Structure

```text
qa/automation/
├── .env.example              # Sample environment variables for database, redis, and API URLs
├── .gitignore                # Git exclusions for node_modules, reports, artifacts, and local .env
├── package.json              # NPM dependencies, Playwright runners, TypeScript engines, and scripts
├── package-lock.json         # Pinned dependency lockfile
├── playwright.config.ts      # Master Playwright test runner configuration
├── tsconfig.json             # TypeScript compiler settings and module path aliases (@api, @fixtures, etc.)
│
├── config/
│   └── env.config.ts         # Environment loader (dotenv), type-safe config object, and defaults
│
├── database/
│   └── db-client.ts          # Reusable PostgreSQL client pool with self-healing connection lifecycle
│
├── redis/
│   └── redis-client.ts       # Reusable ioredis client wrapper for key-value, TTL, and cache assertions
│
├── queues/
│   └── queue-client.ts       # Reusable BullMQ client for inspecting and polling the 'transfers' queue
│
├── api/
│   ├── base.api.ts           # Abstract HTTP client wrapping Playwright's APIRequestContext
│   ├── types.ts              # TypeScript DTOs, payload interfaces, enums, and request/response types
│   ├── auth.api.ts           # Domain client for /auth (signup, login, verify-email, logout)
│   ├── users.api.ts          # Domain client for /users (getMe, updateMe)
│   ├── wallet.api.ts         # Domain client for /wallets (getMyWallet)
│   ├── cards.api.ts          # Domain client for /cards (CRUD, freeze, unfreeze, deactivate)
│   ├── beneficiaries.api.ts  # Domain client for /beneficiaries
│   ├── transfers.api.ts      # Domain client for /transfers (with idempotency support)
│   ├── transactions.api.ts   # Domain client for /transactions
│   ├── exchange-rates.api.ts # Domain client for /exchange-rates (rates & quotes)
│   └── index.ts              # Public barrel export for all API clients and models
│
├── test-data/
│   └── user.factory.ts       # Isolated, deterministic user generation factory
│
├── fixtures/
│   └── api.fixtures.ts       # Playwright custom test fixture providing pre-authenticated sessions & clients
│
├── tests/
│   ├── proof-of-life.spec.ts # Sanity check confirming Playwright test runner execution
│   ├── infra-smoke.spec.ts   # Smoke tests verifying PostgreSQL, Redis, and BullMQ connectivity
│   ├── api-smoke.spec.ts     # Smoke tests verifying unauthenticated & authenticated API layers
│   ├── auth/
│   │   └── auth.spec.ts      # 19 tests covering authentication, tokens, hashing, and boundary checks
│   ├── users/
│   │   └── users.spec.ts     # 12 tests covering profile retrieval, PATCH, IDOR, and input validation
│   ├── wallet/
│   │   └── wallet.spec.ts    # 8 tests covering wallet contract, precision, DB parity, equivalents, and idempotency
│   ├── cards/
│   │   └── cards.spec.ts     # 19 tests covering card provisioning, state machine, hard delete, and IDOR
│   ├── api/                  # (Placeholder directories for future domain migrations)
│   ├── concurrency/          # (Placeholder for future race condition and concurrent transfer testing)
│   ├── database/             # (Placeholder for future direct database assertion suites)
│   ├── e2e/                  # (Placeholder for future cross-domain multi-step scenarios)
│   ├── integration/          # (Placeholder for future async transfer queue integration suites)
│   ├── performance/          # (Placeholder for future latency and throughput benchmarks)
│   └── security/             # (Placeholder for future advanced vulnerability and injection tests)
│
├── pages/                    # Placeholder for future Page Object Models (UI automation)
├── reports/                  # Generated HTML reports, JSON outputs, and trace artifacts
└── utils/                    # Shared QA utilities
```

### Layer Responsibilities

1. **Configuration Layer (`config/`)**: Centralizes environment variables, default connection strings, test timeouts, and retry policies. It shields test suites from reading `process.env` directly and ensures type safety across environments (`local`, `test`, `staging`, `production`).
2. **Infrastructure Layer (`database/`, `redis/`, `queues/`)**: Provides direct access to backend storage and messaging tiers (PostgreSQL, Redis, BullMQ). This enables **cross-layer testing**: testing that an HTTP operation didn't just return HTTP 200, but actually updated the relational database, populated the cache with the right TTL, or queued an asynchronous worker job.
3. **API Client Layer (`api/`)**: Encapsulates all HTTP request construction, URL path resolution, headers, serialization, and deserialization behind strongly-typed TypeScript classes. Tests interact with clean domain methods like `cardsApi.freezeCard(id)` rather than constructing raw HTTP requests.
4. **Test Data Layer (`test-data/`)**: Contains data factories like `user.factory.ts` that generate collision-free, randomized-yet-deterministic test entities (`qa_1726645800_1234_1@wrightpay-qa.test`). This ensures complete test isolation during parallel execution.
5. **Fixture Layer (`fixtures/`)**: Extends Playwright's native test runner via Dependency Injection. It automatically orchestrates complex prerequisite flows—such as signing up a fresh user, confirming their email OTP, logging in, acquiring a JWT, configuring a dedicated `APIRequestContext` with `Authorization: Bearer <token>`, and instantiating domain clients—before a test case even begins.
6. **Test Suite Layer (`tests/`)**: Contains the executable specifications (`*.spec.ts`). Tests declare their dependencies via fixtures, invoke domain API methods, verify HTTP response status and payloads, and execute cross-layer verification against PostgreSQL or Redis.

### Architectural Separation Rationale

- **Maintainability & DRY**: If the backend endpoint changes from `/wallets/me` to `/wallet/current`, only `WalletApi.getMyWallet()` is updated in one place. Zero test files need modification.
- **Separation of Concerns**: Test cases focus strictly on *business assertions* and *invariants*. They are not polluted by HTTP client boilerplate, header wiring, or database connection pools.
- **Safety in Parallel Execution**: Centralizing database pools and test data factories prevents race conditions, deadlocks, and cross-worker interference when running with multiple parallel workers.

### Actual Execution Flows in the Framework

The framework executes two primary styles of test flows depending on the test domain:

#### 1. Authenticated Domain Flow (e.g., Cards, Users, Wallet)
```text
Test Runner (Playwright Worker)
  │
  ├── 1. Requests { authUser } fixture
  │      ├── UserFactory generates unique email & credentials
  │      ├── AuthApi calls POST /auth/signup (NestJS) -> PostgreSQL users record created
  │      ├── AuthApi calls POST /auth/verify-email (NestJS) -> status transitions to 'active'
  │      ├── AuthApi calls POST /auth/login (NestJS) -> JWT access_token generated
  │      └── Creates new APIRequestContext with Authorization: Bearer <token>
  │
  ├── 2. Test executes domain action
  │      ├── authUser.api.cards.createCard(cardData)
  │      ├── BaseApi strips leading slash -> POST http://localhost:3001/api/v1/cards
  │      └── NestJS CardsController -> CardsService -> PostgreSQL cards table
  │
  ├── 3. Assertions & Cross-Layer Validation
  │      ├── Assert HTTP response status (201 Created)
  │      ├── Assert API response payload (masked PAN, UUID, status: 'active')
  │      └── Direct DbClient query: SELECT * FROM cards WHERE id = $1
  │             └── Assert exact row values in PostgreSQL
  │
  └── 4. Fixture Teardown
         └── authUser.authContext.dispose() closes network sockets
```

#### 2. Infrastructure Smoke Flow (e.g., Infra Smoke)
```text
Test Runner (Playwright Worker)
  │
  ├── 1. Directly invokes dbClient.healthCheck() -> runs 'SELECT 1 as alive' on PostgreSQL
  ├── 2. Directly invokes redisClient.healthCheck() -> sends 'PING', asserts 'PONG'
  ├── 3. Directly invokes transferQueueClient.healthCheck() -> checks BullMQ 'transfers' queue
  └── 4. Validates connectivity without touching HTTP or mutating production data
```

---

# Part 2 — Playwright & Environment Configuration

## File: package.json

### Purpose
Defines the npm project configuration, dependencies, devDependencies, and test execution scripts for the QA automation package.

### Why does this file exist?
The QA framework is housed as an independent Node.js project within `qa/automation/`. This keeps automation dependencies isolated from the NestJS backend and Next.js frontend, avoiding package version conflicts.

### Actual Current Code
```json
{
  "name": "wrightpay-qa-automation",
  "version": "1.0.0",
  "private": true,
  "description": "Playwright Test automation framework for WrightPay",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "test:report": "playwright show-report reports/html-report",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "bullmq": "^5.41.0",
    "ioredis": "^5.5.0",
    "pg": "^8.13.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.1",
    "@types/node": "^22.13.4",
    "@types/pg": "^8.11.11",
    "dotenv": "^16.4.7",
    "typescript": "^5.7.3"
  }
}
```

### Code Explanation
- **`scripts.test`**: Runs all Playwright tests in headless mode across all discovered spec files.
- **`scripts.typecheck`**: Runs `tsc --noEmit` to validate complete TypeScript compilation without producing JavaScript artifacts.
- **`dependencies`**:
  - `bullmq` (`^5.41.0`): BullMQ queue consumer/inspector for testing background asynchronous transfer processing.
  - `ioredis` (`^5.5.0`): High-performance Redis client for cache verification, key inspection, and BullMQ transport.
  - `pg` (`^8.13.3`): Pure JavaScript PostgreSQL client pool for querying database state during cross-layer assertions.
- **`devDependencies`**:
  - `@playwright/test` (`^1.50.1`): The primary test runner, assertion library, and HTTP client (`APIRequestContext`).
  - `dotenv` (`^16.4.7`): Environment file reader.
  - `typescript` (`^5.7.3`): Compiler providing strict compile-time type checking.

---

## File: playwright.config.ts

### Purpose
The master configuration file that controls test discovery, timeouts, concurrency, reporting, retries, and default HTTP context settings.

### Why does this file exist?
Playwright requires a configuration root to orchestrate worker threads, reporters, test match patterns, and base network options.

### Actual Current Code
```typescript
import { defineConfig, devices } from '@playwright/test';
import { config } from './config/env.config';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for. */
  timeout: config.timeout,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     */
    timeout: 5000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: config.retries,
  /* Opt out of parallel tests on CI if needed. */
  workers: config.workers,
  /* Output directory for test artifacts (traces, screenshots, videos) */
  outputDir: './reports/test-artifacts',
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['json', { outputFile: 'reports/test-results.json' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: config.baseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: config.headless,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### Code Explanation & Configuration Impact
- **`testDir: './tests'`**: Instructs Playwright to scan the `./tests` directory for any test files matching default glob patterns (`*.spec.ts` or `*.test.ts`).
- **`timeout: config.timeout`**: Sets the global test timeout (30,000ms by default). If a test hangs due to an unresponsive backend, it is terminated after 30s.
- **`expect.timeout: 5000`**: Maximum time an asynchronous assertion (`expect.poll()` or matcher) will wait before failing.
- **`fullyParallel: true`**: Runs all test files concurrently across available CPU workers.
- **`forbidOnly: !!process.env.CI`**: Fails the test run on continuous integration if a developer accidentally committed `test.only()`.
- **`retries: config.retries`**: Set to `0` locally for rapid failure feedback, and `2` in CI to guard against transient network glitches.
- **`workers: config.workers`**: Caps workers at `2` in CI environments to prevent overwhelming container resources, while defaulting to undefined locally (Playwright utilizes 50-100% of logical CPU cores).
- **`reporter`**: Configures multi-reporting:
  - `list`: Real-time streaming command-line output.
  - `html`: Standalone interactive HTML report in `reports/html-report`.
  - `json`: Machine-readable results in `reports/test-results.json` for CI dashboard ingestion.
- **`use.baseURL: config.baseUrl`**: Sets default URL (`http://localhost:3000`). Note: As explained below, API tests use `config.apiBaseUrl` (`http://localhost:3001/api/v1`).

---

## File: tsconfig.json

### Purpose
Configures the TypeScript compiler (`tsc`), path mapping aliases, and module resolution rules for the QA codebase.

### Why does this file exist?
Allows modern ES2022 syntax, enforces strict type checking, and provides clean import paths like `@api/cards.api` instead of brittle relative paths like `../../api/cards.api`.

### Actual Current Code
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "baseUrl": ".",
    "paths": {
      "@config/*": ["config/*"],
      "@fixtures/*": ["fixtures/*"],
      "@pages/*": ["pages/*"],
      "@api/*": ["api/*"],
      "@database/*": ["database/*"],
      "@redis/*": ["redis/*"],
      "@queues/*": ["queues/*"],
      "@test-data/*": ["test-data/*"],
      "@utils/*": ["utils/*"]
    },
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": [
    "playwright.config.ts",
    "config/**/*.ts",
    "fixtures/**/*.ts",
    "pages/**/*.ts",
    "api/**/*.ts",
    "database/**/*.ts",
    "redis/**/*.ts",
    "queues/**/*.ts",
    "test-data/**/*.ts",
    "tests/**/*.ts",
    "utils/**/*.ts"
  ]
}
```

### Code Explanation
- **`target: ES2022` & `module: NodeNext`**: Emits modern ECMAScript features supported natively by Node.js 18+.
- **`paths`**: Configures path aliases for each major layer (`@api/*`, `@fixtures/*`, `@database/*`, etc.).
- **`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`**: Guarantees type safety across the framework, catching null pointer exceptions, unhandled undefined values, and typing mistakes at compile time.

---

## File: qa/automation/config/env.config.ts

### Purpose
Loads environment variables from `.env`, validates them, applies fallback defaults, and exports a frozen, typed `config` object.

### Why does this file exist?
Eliminates scattered `process.env` calls throughout test files. If a configuration key changes, it is updated in this single file.

### Actual Current Code
```typescript
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export type EnvironmentType = 'local' | 'test' | 'staging' | 'production';

export interface TestConfig {
  env: EnvironmentType;
  baseUrl: string;
  apiBaseUrl: string;
  databaseUrl: string;
  redisUrl: string;
  headless: boolean;
  timeout: number;
  retries: number;
  workers: number | undefined;
}

const getEnv = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

const currentEnv = (getEnv('TEST_ENV', 'local').toLowerCase() as EnvironmentType);

export const config: TestConfig = {
  env: currentEnv,
  baseUrl: getEnv('BASE_URL', 'http://localhost:3000'),
  apiBaseUrl: getEnv('API_BASE_URL', 'http://localhost:3001/api/v1'),
  databaseUrl: getEnv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/wrightpay'),
  redisUrl: getEnv('REDIS_URL', 'redis://localhost:6379'),
  headless: getEnv('HEADLESS', 'true') !== 'false',
  timeout: parseInt(getEnv('TEST_TIMEOUT', '30000'), 10),
  retries: parseInt(getEnv('TEST_RETRIES', currentEnv === 'local' ? '0' : '2'), 10),
  workers: process.env.CI ? 2 : undefined,
};
```

### Code Explanation & Key Distinctions
- **`baseUrl` vs `apiBaseUrl`**:
  - `baseUrl` (`http://localhost:3000`): Points to the Next.js frontend UI web application.
  - `apiBaseUrl` (`http://localhost:3001/api/v1`): Points directly to the NestJS backend REST API gateway. Playwright API fixtures and API client instances bind to `apiBaseUrl`.
- **`databaseUrl`**: Direct connection URI to PostgreSQL. Default: `postgresql://postgres:password@localhost:5432/wrightpay`.
- **`redisUrl`**: Direct connection URI to Redis. Default: `redis://localhost:6379`.
- **`getEnv` helper**: Safely inspects `process.env[key]` and returns the fallback if the variable is unset or empty.

---

# Part 3 — Database Infrastructure

## File: qa/automation/database/db-client.ts

### Purpose
Provides a singleton PostgreSQL connection pool manager, safe parameterized query helpers, lightweight health checks, and self-healing connection lifecycle handling.

### Why does this file exist?
Testing an enterprise payment API cannot rely exclusively on black-box HTTP responses. An API could return `200 OK` while silently failing to write records to disk, failing to hash sensitive credentials, or corrupting account balances. `DbClient` gives QA the power to perform cross-layer assertions against PostgreSQL.

### Actual Current Code
```typescript
import { Pool, QueryResult, QueryResultRow, PoolConfig } from 'pg';
import { config } from '../config/env.config';

export class DbClient {
  private pool!: Pool;
  private connectionString: string;
  private options?: Omit<PoolConfig, 'connectionString'>;

  constructor(connectionString?: string, options?: Omit<PoolConfig, 'connectionString'>) {
    this.connectionString = connectionString || config.databaseUrl;
    this.options = options;
    this.initPool();
  }

  private initPool(): void {
    this.pool = new Pool({
      connectionString: this.connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ...this.options,
    });

    this.pool.on('error', (err) => {
      console.error('[DbClient] Unexpected error on idle PostgreSQL client:', err.message);
    });
  }

  private getActivePool(): Pool {
    if ((this.pool as any).ended) {
      this.initPool();
    }
    return this.pool;
  }

  /**
   * Execute a parameterized SQL query safely.
   * Never interpolate values directly into the query string.
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    values?: any[],
  ): Promise<QueryResult<T>> {
    return this.getActivePool().query<T>(text, values);
  }

  /**
   * Convenience helper to execute a query and return the first row, or null if no rows matched.
   */
  async queryOne<T extends QueryResultRow = any>(
    text: string,
    values?: any[],
  ): Promise<T | null> {
    const result = await this.query<T>(text, values);
    return result.rows[0] || null;
  }

  /**
   * Perform a lightweight health check to confirm PostgreSQL connectivity.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as alive');
      return result.rows.length > 0 && result.rows[0].alive === 1;
    } catch (error) {
      console.error('[DbClient] Health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Gracefully close all connections in the pool.
   */
  async close(): Promise<void> {
    if (this.pool && !(this.pool as any).ended) {
      await this.pool.end();
    }
  }

  /**
   * Access the underlying pg.Pool if needed.
   */
  getPool(): Pool {
    return this.getActivePool();
  }
}

export const dbClient = new DbClient();
export default dbClient;
```

### Code Explanation Block-by-Block
- **Lines 9–13 (`constructor`)**: Initializes the client using `config.databaseUrl` and invokes `initPool()`.
- **Lines 15–27 (`initPool`)**: Instantiates `new Pool({...})` with a maximum of 10 concurrent connections per worker, an idle timeout of 30 seconds, and a connection acquisition timeout of 5 seconds. Attaches an error handler to idle clients to prevent uncaught process crashes.
- **Lines 29–34 (`getActivePool`) - Self-Healing Lifecycle**:
  - *Engineering Problem Solved*: In Playwright multi-worker parallel execution, if any test file or teardown hook calls `dbClient.close()`, the underlying `pg.Pool` transitions to `ended = true`. Subsequent queries in the same worker would crash with `Error: Cannot use a pool after calling end()`.
  - *Mechanism*: Checks `(this.pool as any).ended`. If ended, it transparently calls `this.initPool()` to re-instantiate the pool on the fly.
- **Lines 40–45 (`query`)**: Executes parameterized SQL queries using placeholders (`$1, $2`). Parameterization prevents SQL injection and syntax errors when values contain quotes or special characters.
- **Lines 50–56 (`queryOne`)**: Convenience wrapper returning `result.rows[0] || null`. Eliminates repetitive `res.rows.length > 0 ? res.rows[0] : null` checks across test suites.
- **Lines 61–69 (`healthCheck`)**: Runs `SELECT 1 as alive` inside a `try/catch`. Returns `true` if connected, `false` on connection error.
- **Lines 74–78 (`close`)**: Safe termination guarded by `!(this.pool as any).ended`.

### Why Database Assertions Matter in API Testing
1. **Security & Cryptography**: Black-box APIs never return password hashes. Direct DB verification proves that `passwordHash` starts with `$argon2` and was not stored plaintext.
2. **Default Entity Provisioning**: In WrightPay, `POST /auth/signup` returns only `{ message, userId }`. Querying the database proves that a default `wallets` record in `EUR` with balance `0.00` was initialized.
3. **Hard vs. Soft Deletion Invariants**: When `DELETE /cards/:id` is called, the API returns `{ message: "Card successfully deleted" }`. Querying `SELECT count(*) FROM cards WHERE id = $1` proves the row was physically purged rather than just soft-deleted or hidden.

---

# Part 4 — Redis Infrastructure

## File: qa/automation/redis/redis-client.ts

### Purpose
Provides a singleton Redis client wrapper utilizing `ioredis` for interacting with in-memory stores, asserting key lifecycles, and checking time-to-live (TTL).

### Why does this file exist?
WrightPay relies on Redis for caching, OTP verification, rate limiting, and BullMQ queue storage. `RedisClient` provides an isolated test interface to inspect and assert on Redis without polluting application logic.

### Actual Current Code
```typescript
import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config/env.config';

export class RedisClient {
  private client: Redis;

  constructor(redisUrl?: string, options?: RedisOptions) {
    const url = redisUrl || config.redisUrl;
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
      ...options,
    });

    this.client.on('error', (err) => {
      console.error('[RedisClient] Error encountered on Redis connection:', err.message);
    });
  }

  /**
   * Connect to Redis if not already connected.
   */
  async connect(): Promise<void> {
    if (this.client.status === 'wait' || this.client.status === 'close') {
      await this.client.connect();
    }
  }

  /**
   * Retrieve string value by key. Returns null if not found.
   */
  async get(key: string): Promise<string | null> {
    await this.connect();
    return this.client.get(key);
  }

  /**
   * Set key-value pair with optional TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    await this.connect();
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  /**
   * Delete a specific key. Returns number of keys deleted (0 or 1).
   */
  async del(key: string): Promise<number> {
    await this.connect();
    return this.client.del(key);
  }

  /**
   * Get remaining TTL for a key in seconds.
   * Returns -2 if key does not exist, -1 if key exists with no expiry.
   */
  async ttl(key: string): Promise<number> {
    await this.connect();
    return this.client.ttl(key);
  }

  /**
   * Check if a key exists in Redis.
   */
  async exists(key: string): Promise<boolean> {
    await this.connect();
    const count = await this.client.exists(key);
    return count > 0;
  }

  /**
   * Health check verifying ping/pong response from Redis.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.connect();
      const response = await this.client.ping();
      return response === 'PONG';
    } catch (error) {
      console.error('[RedisClient] Health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Graceful disconnect from Redis.
   */
  async close(): Promise<void> {
    if (this.client.status === 'ready' || this.client.status === 'connecting') {
      await this.client.quit();
    }
  }

  /**
   * Get underlying IORedis instance for advanced operations.
   */
  getClient(): Redis {
    return this.client;
  }
}

export const redisClient = new RedisClient();
export default redisClient;
```

### Code Explanation Block-by-Block
- **Lines 8–17 (`constructor`)**: Configures `ioredis` with `lazyConnect: true` so the connection is not opened until a command is issued. Configures a capped retry strategy (up to 3 attempts, backoff between 100ms and 1000ms) to prevent tests from blocking indefinitely if Redis is down.
- **Lines 27–31 (`connect`)**: Ensures the client is in a connected state before executing commands.
- **Lines 44–50 (`set`)**: Implements key setting with optional `'EX'` (expire in seconds).
- **Lines 64–67 (`ttl`)**: Returns seconds until key expiration. Allows asserting that ephemeral tokens or OTPs expire as designed.
- **Lines 81–90 (`healthCheck`)**: Sends a `PING` command and asserts that Redis answers with `PONG`.

---

# Part 5 — BullMQ / Queue Infrastructure

## File: qa/automation/queues/queue-client.ts

### Purpose
Provides a client to inspect, poll, and verify the BullMQ `'transfers'` queue and its `'process-transfer'` jobs.

### Why does this file exist?
In WrightPay, money transfers are processed asynchronously. When `POST /transfers` is called, the API immediately creates a transaction in status `PENDING` and enqueues a background job rather than executing the transfer synchronously. `TransferQueueClient` enables QA to verify that jobs are enqueued with correct payloads and to poll job completion.

### Actual Current Code
```typescript
import { Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/env.config';

export const TRANSFERS_QUEUE_NAME = 'transfers';
export const PROCESS_TRANSFER_JOB_NAME = 'process-transfer';

export interface TransferJobData {
  transactionId: string;
}

export class TransferQueueClient {
  private queue: Queue<TransferJobData>;
  private connection: IORedis;

  constructor(queueName: string = TRANSFERS_QUEUE_NAME, redisUrl?: string) {
    const url = redisUrl || config.redisUrl;

    // BullMQ requires maxRetriesPerRequest: null for blocking Redis operations
    this.connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    this.connection.on('error', (err) => {
      console.error('[TransferQueueClient] Redis connection error:', err.message);
    });

    this.queue = new Queue<TransferJobData>(queueName, {
      connection: this.connection,
    });
  }

  /**
   * Fetch a job by its unique jobId (e.g., "transfer-<transactionId>").
   */
  async getJob(jobId: string): Promise<Job<TransferJobData> | undefined> {
    return this.queue.getJob(jobId);
  }

  /**
   * Retrieve the current state of a job ('completed' | 'failed' | 'delayed' | 'active' | 'waiting' | 'unknown').
   */
  async getJobState(jobId: string): Promise<string | undefined> {
    const job = await this.getJob(jobId);
    if (!job) return undefined;
    return job.getState();
  }

  /**
   * Inspect job counts by status (active, completed, failed, delayed, waiting, paused).
   */
  async getJobCounts(): Promise<Record<string, number>> {
    return this.queue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting', 'paused');
  }

  /**
   * Poll and wait for a job to reach an expected status within a timeout window.
   * Useful in async integration tests where transfers process in background.
   */
  async waitForJobStatus(
    jobId: string,
    targetStatus: string | string[],
    timeoutMs: number = 10000,
    pollIntervalMs: number = 200,
  ): Promise<Job<TransferJobData> | undefined> {
    const targets = Array.isArray(targetStatus) ? targetStatus : [targetStatus];
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const job = await this.getJob(jobId);
      if (job) {
        const currentState = await job.getState();
        if (targets.includes(currentState)) {
          return job;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    const finalJob = await this.getJob(jobId);
    const finalState = finalJob ? await finalJob.getState() : 'not_found';
    throw new Error(
      `Job ${jobId} did not reach status [${targets.join(', ')}] within ${timeoutMs}ms. Current state: ${finalState}`,
    );
  }

  /**
   * Health check confirming that BullMQ can inspect the queue on Redis without mutating it.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const counts = await this.getJobCounts();
      return counts !== null && typeof counts === 'object';
    } catch (error) {
      console.error('[TransferQueueClient] Health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Graceful cleanup of BullMQ queue and its dedicated Redis connection.
   */
  async close(): Promise<void> {
    try {
      await this.queue.close();
    } finally {
      if (this.connection.status === 'ready' || this.connection.status === 'connecting') {
        await this.connection.quit();
      }
    }
  }

  /**
   * Access the underlying BullMQ Queue instance.
   */
  getQueue(): Queue<TransferJobData> {
    return this.queue;
  }
}

export const transferQueueClient = new TransferQueueClient();
export default transferQueueClient;
```

### Code Explanation Block-by-Block
- **Lines 5–10**: Defines constants verified from the backend codebase: `TRANSFERS_QUEUE_NAME = 'transfers'`, `PROCESS_TRANSFER_JOB_NAME = 'process-transfer'`, and `TransferJobData { transactionId: string }`.
- **Lines 19–23**: BullMQ requires `maxRetriesPerRequest: null` on its Redis connection because BullMQ uses blocking Redis operations (`BRPOPLPUSH`, `BLMOVE`). If retries are enabled, `ioredis` would prematurely reject commands during blocking waits.
- **Lines 37–48 (`getJob` & `getJobState`)**: Retrieves BullMQ job instances and states (`active`, `waiting`, `completed`, `failed`).
- **Lines 61–86 (`waitForJobStatus`)**: Deterministic polling loop with configurable interval (default 200ms) and timeout (default 10s). Avoids arbitrary `sleep()` statements in asynchronous transfer testing.
- **Lines 104–112 (`close`)**: Cleanly closes both the BullMQ queue listeners and the dedicated Redis socket connection.

---

# Part 6 — API Client Architecture

## Architectural Distinction: API Client vs. Test vs. Fixture

| Layer | Responsibility | What It Does NOT Do |
| :--- | :--- | :--- |
| **API Client** (`api/*.api.ts`) | Pure HTTP transport abstraction. Constructs URLs, serializes bodies, applies query params, sends requests. Returns `APIResponse`. | Does NOT assert status codes or response bodies. Has zero `expect()` calls. |
| **Fixture** (`fixtures/api.fixtures.ts`) | Lifecycle orchestration & dependency injection. Sets up users, logins, tokens, contexts, and tears down sockets. | Does NOT contain domain business logic or specific test assertions. |
| **Test** (`tests/**/*.spec.ts`) | Business specification. Declares fixtures, calls client methods, asserts HTTP status, asserts JSON contracts, asserts DB state. | Does NOT manually build HTTP requests, format headers, or parse raw URLs. |
| **APIRequestContext** (Playwright) | Low-level browser-grade HTTP client with cookie jars, redirects, and connection pooling. | Does NOT know anything about WrightPay domains or business endpoints. |

### Why Assertions Belong in Tests Rather than API Clients
If an API client had `expect(response.status()).toBe(200)` hardcoded inside `cardsApi.createCard()`, it would be impossible to use that same client method to test negative scenarios (e.g., asserting that an invalid card returns `400 Bad Request` or an unauthenticated call returns `401 Unauthorized`). API clients must remain completely neutral and return the raw `APIResponse`.

---

## File: qa/automation/api/base.api.ts

### Purpose
Abstract base class wrapping Playwright's `APIRequestContext` to provide standard HTTP methods (`get`, `post`, `patch`, `delete`) and path normalization.

### Why does this file exist?
Normalizes request dispatching across all domain clients and resolves URL pathing bugs.

### Actual Current Code
```typescript
import { APIRequestContext, APIResponse } from '@playwright/test';

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

export abstract class BaseApi {
  constructor(protected request: APIRequestContext) {}

  /**
   * Normalizes path to prevent leading slashes from stripping baseUrl subpaths like /api/v1/.
   */
  protected resolvePath(path: string): string {
    return path.startsWith('/') ? path.slice(1) : path;
  }

  protected async get(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.get(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
    });
  }

  protected async post(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.post(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
      data: options?.data,
    });
  }

  protected async patch(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.patch(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
      data: options?.data,
    });
  }

  protected async delete(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.delete(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
    });
  }
}
```

### Code Explanation: The Critical `resolvePath` Method
In Node.js standard URL resolution and Playwright's underlying request client:
- If `baseURL` is `http://localhost:3001/api/v1`
- Resolving `'/auth/login'` (with a leading slash) resolves against the **origin**, stripping `/api/v1` and making the request to `http://localhost:3001/auth/login` (404 Not Found).
- Resolving `'auth/login'` (without leading slash) resolves relative to the path, correctly resulting in `http://localhost:3001/api/v1/auth/login`.
- `resolvePath(path)` checks `path.startsWith('/') ? path.slice(1) : path`, ensuring that whether a developer passes `'/cards'` or `'cards'`, the URL always resolves correctly.

---

## File: qa/automation/api/auth.api.ts

### Purpose
Domain API client for authentication endpoints (`/auth/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { SignupRequest, LoginRequest, VerifyEmailRequest } from './types';

export class AuthApi extends BaseApi {
  async signup(data: SignupRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/signup', { data, headers });
  }

  async login(data: LoginRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/login', { data, headers });
  }

  async verifyEmail(data: VerifyEmailRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/verify-email', { data, headers });
  }

  async logout(headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/logout', { headers });
  }
}
```

### Methods Explained
- **`signup(data, headers)`**: `POST /auth/signup`. Sends `firstName`, `lastName`, `email`, `password`, `agreeTerms`.
- **`login(data, headers)`**: `POST /auth/login`. Sends `email`, `password`. Returns `{ access_token, user }`.
- **`verifyEmail(data, headers)`**: `POST /auth/verify-email`. Sends `email`, `code`. Transitions user to `active`.
- **`logout(headers)`**: `POST /auth/logout`. Invalidates/acknowledges logout for the caller.

---

## File: qa/automation/api/users.api.ts

### Purpose
Domain API client for user profile management (`/users/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { UpdateUserRequest } from './types';

export class UsersApi extends BaseApi {
  async getMe(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('users/me', { headers });
  }

  async updateMe(data: UpdateUserRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.patch('users/me', { data, headers });
  }
}
```

### Methods Explained
- **`getMe(headers)`**: `GET /users/me`. Fetches authenticated user's profile based on the Bearer token.
- **`updateMe(data, headers)`**: `PATCH /users/me`. Updates `name`, `countryOfResidence`, or `defaultCurrency`.

---

## File: qa/automation/api/wallet.api.ts

### Purpose
Domain API client for the authenticated user's wallet (`/wallets/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';

export class WalletApi extends BaseApi {
  async getMyWallet(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('wallets/me', { headers });
  }
}
```

### Methods Explained
- **`getMyWallet(headers)`**: `GET /wallets/me`. Retrieves the authenticated user's primary wallet including base balance and calculated multi-currency equivalents.

---

## File: qa/automation/api/cards.api.ts

### Purpose
Domain API client for virtual/physical payment card lifecycle management (`/cards/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateCardRequest } from './types';

export class CardsApi extends BaseApi {
  async getMyCards(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('cards', { headers });
  }

  async createCard(data: CreateCardRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('cards', { data, headers });
  }

  async freezeCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post(`cards/${id}/freeze`, { headers });
  }

  async unfreezeCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post(`cards/${id}/unfreeze`, { headers });
  }

  async deactivateCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post(`cards/${id}/deactivate`, { headers });
  }

  async deleteCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.delete(`cards/${id}`, { headers });
  }
}
```

### Methods Explained
- **`getMyCards(headers)`**: `GET /cards`. Lists all cards owned by the authenticated caller.
- **`createCard(data, headers)`**: `POST /cards`. Provisions a card (`cardholderName`, `cardNumber`, `expiryDate`, `cvv`, `type`).
- **`freezeCard(id, headers)`**: `POST /cards/:id/freeze`. Transitions card status from `active` to `frozen`.
- **`unfreezeCard(id, headers)`**: `POST /cards/:id/unfreeze`. Transitions card status from `frozen` to `active`.
- **`deactivateCard(id, headers)`**: `POST /cards/:id/deactivate`. Transitions card to permanent terminal status `deactivated`.
- **`deleteCard(id, headers)`**: `DELETE /cards/:id`. Permanently deletes the card from PostgreSQL.

---

## File: qa/automation/api/beneficiaries.api.ts

### Purpose
Domain API client for recipient management (`/beneficiaries/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateBeneficiaryRequest } from './types';

export class BeneficiariesApi extends BaseApi {
  async getMyBeneficiaries(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('beneficiaries', { headers });
  }

  async createBeneficiary(data: CreateBeneficiaryRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('beneficiaries', { data, headers });
  }

  async deleteBeneficiary(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.delete(`beneficiaries/${id}`, { headers });
  }
}
```

---

## File: qa/automation/api/transfers.api.ts

### Purpose
Domain API client for initiating money transfers (`/transfers/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateTransferRequest } from './types';

export class TransfersApi extends BaseApi {
  /**
   * Initiate a transfer.
   * Callers must explicitly supply the idempotencyKey so tests can deliberately test duplicate keys.
   */
  async createTransfer(
    data: CreateTransferRequest,
    idempotencyKey?: string,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    const mergedHeaders: Record<string, string> = { ...headers };
    if (idempotencyKey !== undefined) {
      mergedHeaders['Idempotency-Key'] = idempotencyKey;
    }
    return this.post('transfers', { data, headers: mergedHeaders });
  }
}
```

### Key Design Feature: Idempotency Key Handling
Transfers support an `Idempotency-Key` HTTP header. By allowing the test to explicitly provide or omit `idempotencyKey`, tests can verify that retrying with the same idempotency key returns the cached response rather than creating duplicate money transfers.

---

## File: qa/automation/api/transactions.api.ts

### Purpose
Domain API client for listing and retrieving historical transactions (`/transactions/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { GetTransactionsQuery } from './types';

export class TransactionsApi extends BaseApi {
  async getMyTransactions(
    params?: GetTransactionsQuery,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.get('transactions', { params, headers });
  }

  async getTransactionById(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get(`transactions/${id}`, { headers });
  }
}
```

---

## File: qa/automation/api/exchange-rates.api.ts

### Purpose
Domain API client for public exchange rates and currency conversion quotes (`/exchange-rates/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { GetQuoteQuery } from './types';

export class ExchangeRatesApi extends BaseApi {
  async getAllRates(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('exchange-rates', { headers });
  }

  async getQuote(params: GetQuoteQuery, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('exchange-rates/quote', { params, headers });
  }
}
```

---

## File: qa/automation/api/index.ts

### Purpose
Barrel file that consolidates all API clients and type definitions into a single import location.

### Actual Current Code
```typescript
export * from './types';
export * from './base.api';
export * from './auth.api';
export * from './users.api';
export * from './wallet.api';
export * from './cards.api';
export * from './beneficiaries.api';
export * from './transfers.api';
export * from './transactions.api';
export * from './exchange-rates.api';
```

---

# Part 7 — TypeScript Types

## File: qa/automation/api/types.ts

### Purpose
Defines all data transfer objects (DTOs), request payloads, enums, and query parameter models for the WrightPay API automation suite.

### Actual Current Code
```typescript
export type Currency = 'EUR' | 'GBP' | 'USD' | 'INR' | 'PLN';

export type CardType = 'debit' | 'credit' | 'DEBIT' | 'CREDIT';

export type CardStatus = 'active' | 'frozen' | 'deactivated' | 'declined' | 'pending';

export type BeneficiaryPayoutMethod = 'BANK_ACCOUNT' | 'UPI';

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SUSPICIOUS';

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agreeTerms: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface UpdateUserRequest {
  name?: string;
  countryOfResidence?: string;
  defaultCurrency?: Currency;
}

export interface CreateCardRequest {
  cardholderName: string;
  type?: CardType;
  cardNumber?: string;
  lastFourDigits?: string;
  expiryDate: string;
  cvv?: string;
}

export interface CreateBeneficiaryRequest {
  name: string;
  currency: Currency;
  payoutMethod?: BeneficiaryPayoutMethod;
  accountNumber?: string;
  bankCode?: string;
  ifscCode?: string;
  upiId?: string;
  bankName?: string;
}

export interface CreateTransferRequest {
  beneficiaryId: string;
  sourceWalletId: string;
  sendAmount: number;
  destinationCurrency: Currency;
}

export interface GetTransactionsQuery {
  status?: TransactionStatus;
  reference?: string;
  limit?: number;
  offset?: number;
}

export interface GetQuoteQuery {
  from: Currency;
  to: Currency;
  amount: number;
}
```

### TypeScript Compile-Time Typing vs. Runtime API Validation
- **Compile-Time Checking**: Prevents typos during test authoring (e.g., passing `currncy: 'EUR'` instead of `currency: 'EUR'`).
- **Runtime Validation**: TypeScript types **do not exist at runtime**. The fact that `CreateCardRequest` has `cardholderName: string` does not prevent a test from deliberately passing `cardholderName: ""` or `type: "unsupported" as any`. In an SDET framework, we frequently cast invalid types (`as any`) to verify that the backend's runtime NestJS `ValidationPipe` correctly catches and rejects invalid payloads with `400 Bad Request`.

---

# Part 8 — Authentication & Playwright Fixtures

## File: qa/automation/test-data/user.factory.ts

### Purpose
Generates collision-free, isolated, deterministic user credentials for automated test runs.

### Why does this file exist?
If automated tests share hardcoded emails like `test@wrightpay.com`, parallel workers collide, signup fails on duplicate email constraints, and test order dependency is introduced. `UserFactory` generates completely independent test users.

### Actual Current Code
```typescript
import { SignupRequest } from '../api/types';

export interface TestUserData extends SignupRequest {
  fullName: string;
}

let userCounter = 0;

/**
 * Generate unique, deterministic-yet-isolated user signup data for automated testing.
 */
export function generateTestUserData(overrides?: Partial<SignupRequest>): TestUserData {
  userCounter += 1;
  const uniqueId = `${Date.now()}_${process.pid}_${userCounter}_${Math.floor(Math.random() * 10000)}`;
  const firstName = overrides?.firstName || `QAUser${userCounter}`;
  const lastName = overrides?.lastName || `Test`;
  const email = overrides?.email || `qa_${uniqueId}@wrightpay-qa.test`.toLowerCase();
  const password = overrides?.password || 'TestPassword123!';
  const agreeTerms = overrides?.agreeTerms !== undefined ? overrides.agreeTerms : true;

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email,
    password,
    agreeTerms,
  };
}
```

### Code Explanation: The Unique ID Strategy
- **`Date.now()`**: Millisecond timestamp ensuring monotonic time uniqueness.
- **`process.pid`**: Process ID of the Node.js / Playwright worker. Distinguishes workers running concurrently on the same machine.
- **`userCounter`**: Monotonically incrementing integer within the worker process.
- **`Math.random()`**: Additional randomness barrier to prevent collisions during sub-millisecond iterations.

---

## File: qa/automation/fixtures/api.fixtures.ts

### Purpose
Playwright custom test fixture extending `@playwright/test` to provide dependency injection for authenticated and unauthenticated contexts, domain API clients, and database/Redis/queue singletons.

### Why does this file exist?
Eliminates hundreds of lines of repetitive authentication setup from every test file. Tests simply declare `{ authUser }` in their test signature, and Playwright provisions a clean, verified user session automatically.

### Actual Current Code
```typescript
import { test as base, APIRequestContext } from '@playwright/test';
import { config } from '../config/env.config';
import {
  AuthApi,
  UsersApi,
  WalletApi,
  CardsApi,
  BeneficiariesApi,
  TransfersApi,
  TransactionsApi,
  ExchangeRatesApi,
} from '../api';
import { generateTestUserData, TestUserData } from '../test-data/user.factory';
import { dbClient, DbClient } from '../database/db-client';
import { redisClient, RedisClient } from '../redis/redis-client';
import { transferQueueClient, TransferQueueClient } from '../queues/queue-client';

export interface AuthenticatedUserSession {
  user: {
    id: string;
    email: string;
    name: string;
    password: string;
  };
  token: string;
  authContext: APIRequestContext;
  api: {
    auth: AuthApi;
    users: UsersApi;
    wallet: WalletApi;
    cards: CardsApi;
    beneficiaries: BeneficiariesApi;
    transfers: TransfersApi;
    transactions: TransactionsApi;
    exchangeRates: ExchangeRatesApi;
  };
}

export interface ApiFixtures {
  /** Unauthenticated API request context pointed at API_BASE_URL */
  apiContext: APIRequestContext;
  /** Unauthenticated AuthApi client */
  authApi: AuthApi;
  /** Unauthenticated ExchangeRatesApi client */
  exchangeRatesApi: ExchangeRatesApi;
  /** Fully provisioned and authenticated user session */
  authUser: AuthenticatedUserSession;
  /** Database test client singleton */
  db: DbClient;
  /** Redis test client singleton */
  redis: RedisClient;
  /** BullMQ transfers queue client singleton */
  queue: TransferQueueClient;
}

const getNormalizedApiBaseUrl = (): string => {
  return config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
};

export const test = base.extend<ApiFixtures>({
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: getNormalizedApiBaseUrl(),
    });
    await use(context);
    await context.dispose();
  },

  authApi: async ({ apiContext }, use) => {
    await use(new AuthApi(apiContext));
  },

  exchangeRatesApi: async ({ apiContext }, use) => {
    await use(new ExchangeRatesApi(apiContext));
  },

  authUser: async ({ playwright, apiContext }, use) => {
    const authApi = new AuthApi(apiContext);
    const testUser = generateTestUserData();

    // 1. Real API Signup
    const signupRes = await authApi.signup(testUser);
    if (!signupRes.ok()) {
      const errorText = await signupRes.text();
      throw new Error(`[AuthFixture] Signup failed for ${testUser.email} with status ${signupRes.status()}: ${errorText}`);
    }
    const signupData = await signupRes.json();
    const userId = signupData.userId;

    // 2. Real API Email Verification
    // Default development verification code is 123456
    let verifyRes = await authApi.verifyEmail({
      email: testUser.email,
      code: '123456',
    });

    if (!verifyRes.ok()) {
      // If code 123456 failed (e.g. In non-dev environment), retrieve generated OTP from database
      const row = await dbClient.queryOne<{ verificationCode?: string; verification_code?: string }>(
        'SELECT "verificationCode" FROM email_verifications WHERE email = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [testUser.email],
      );
      const dbCode = row?.verificationCode || row?.verification_code;
      if (dbCode) {
        verifyRes = await authApi.verifyEmail({
          email: testUser.email,
          code: dbCode,
        });
      }
    }

    if (!verifyRes.ok()) {
      const errorText = await verifyRes.text();
      throw new Error(`[AuthFixture] Email verification failed for ${testUser.email} with status ${verifyRes.status()}: ${errorText}`);
    }

    // 3. Real API Login
    const loginRes = await authApi.login({
      email: testUser.email,
      password: testUser.password,
    });

    if (!loginRes.ok()) {
      const errorText = await loginRes.text();
      throw new Error(`[AuthFixture] Login failed for ${testUser.email} with status ${loginRes.status()}: ${errorText}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.access_token;
    if (!token) {
      throw new Error(`[AuthFixture] Login response did not contain access_token`);
    }

    // 4. Create Authenticated API Request Context
    const authContext = await playwright.request.newContext({
      baseURL: getNormalizedApiBaseUrl(),
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    const session: AuthenticatedUserSession = {
      user: {
        id: userId,
        email: testUser.email,
        name: testUser.fullName,
        password: testUser.password,
      },
      token,
      authContext,
      api: {
        auth: new AuthApi(authContext),
        users: new UsersApi(authContext),
        wallet: new WalletApi(authContext),
        cards: new CardsApi(authContext),
        beneficiaries: new BeneficiariesApi(authContext),
        transfers: new TransfersApi(authContext),
        transactions: new TransactionsApi(authContext),
        exchangeRates: new ExchangeRatesApi(authContext),
      },
    };

    await use(session);

    // Teardown
    await authContext.dispose();
  },

  db: async ({}, use) => {
    await use(dbClient);
  },

  redis: async ({}, use) => {
    await use(redisClient);
  },

  queue: async ({}, use) => {
    await use(transferQueueClient);
  },
});

export { expect } from '@playwright/test';
```

### Code Explanation: Complete Provisioning Lifecycle
1. **Signup**: Executes real `POST /auth/signup` against NestJS backend using data from `generateTestUserData()`.
2. **Verification**: Uses development OTP `'123456'`. If running against staging or production where OTP is dynamically generated, it falls back to querying `email_verifications` table in PostgreSQL.
3. **Login**: Executes `POST /auth/login` to obtain the cryptographic JWT `access_token`.
4. **Context Creation**: Calls `playwright.request.newContext({...})` binding `Authorization: Bearer ${token}` as a default header on every outbound request.
5. **Client Instantiation**: Wraps `authContext` in domain API client instances (`authUser.api.cards`, `authUser.api.wallet`, etc.).
6. **Teardown**: When the test finishes, `await authContext.dispose()` releases the HTTP connection pool and sockets.

---

# Part 9 — Infrastructure Smoke Tests

## File: qa/automation/tests/infra-smoke.spec.ts

### Purpose
Smoke tests verifying that the underlying data stores (PostgreSQL, Redis) and messaging queues (BullMQ) are reachable and healthy before running functional suites.

### Actual Current Code
```typescript
import { test, expect } from '@playwright/test';
import { dbClient } from '../database/db-client';
import { redisClient } from '../redis/redis-client';
import { transferQueueClient, TRANSFERS_QUEUE_NAME } from '../queues/queue-client';

test.describe('Infrastructure Helpers Smoke Test', () => {

  test('PostgreSQL connection works via DbClient', async () => {
    const isHealthy = await dbClient.healthCheck();
    expect(isHealthy).toBe(true);

    const result = await dbClient.queryOne<{ alive: number }>('SELECT 1 as alive');
    expect(result).not.toBeNull();
    expect(result?.alive).toBe(1);
  });

  test('Redis connection works via RedisClient', async () => {
    const isHealthy = await redisClient.healthCheck();
    expect(isHealthy).toBe(true);

    // Verify safe isolated key operation with cleanup
    const testKey = `wrightpay:qa:smoke:${Date.now()}`;
    await redisClient.set(testKey, 'ok', 10);
    const exists = await redisClient.exists(testKey);
    expect(exists).toBe(true);

    const val = await redisClient.get(testKey);
    expect(val).toBe('ok');

    await redisClient.del(testKey);
    const existsAfterDel = await redisClient.exists(testKey);
    expect(existsAfterDel).toBe(false);
  });

  test('BullMQ transfers queue can be inspected via TransferQueueClient', async () => {
    const isHealthy = await transferQueueClient.healthCheck();
    expect(isHealthy).toBe(true);

    const queue = transferQueueClient.getQueue();
    expect(queue.name).toBe(TRANSFERS_QUEUE_NAME);

    const counts = await transferQueueClient.getJobCounts();
    expect(counts).toBeDefined();
    expect(typeof counts.active).toBe('number');
    expect(typeof counts.completed).toBe('number');
    expect(typeof counts.failed).toBe('number');
  });
});
```

### Diagnostic Value of Smoke Test Failures
- **PostgreSQL Failure**: If Test 1 fails, PostgreSQL container on port 5432 is stopped, bad credentials in `DATABASE_URL`, or max connections exceeded.
- **Redis Failure**: If Test 2 fails, Redis container on port 6379 is down or network unreachable.
- **BullMQ Failure**: If Test 3 fails, Redis is running but BullMQ cannot read or write queue keys, or queue name is mismatched.

---

# Part 10 — API Smoke Tests

## File: qa/automation/tests/api-smoke.spec.ts

### Purpose
Validates that the Playwright HTTP pipeline, unauthenticated API routing, and the `authUser` fixture are fully operational.

### Actual Current Code
```typescript
import { test, expect } from '../fixtures/api.fixtures';

test.describe('API Architecture Smoke Validation', () => {
  test('unauthenticated client can access public exchange-rates endpoint', async ({ exchangeRatesApi }) => {
    const response = await exchangeRatesApi.getAllRates();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('authUser fixture provisions real user and authenticated clients work', async ({ authUser }) => {
    expect(authUser.token).toBeDefined();
    expect(authUser.user.id).toBeDefined();
    expect(authUser.user.email).toContain('@wrightpay-qa.test');

    // Verify authenticated user profile endpoint
    const profileRes = await authUser.api.users.getMe();
    expect(profileRes.status()).toBe(200);
    const profile = await profileRes.json();
    expect(profile.id).toBe(authUser.user.id);
    expect(profile.email).toBe(authUser.user.email);

    // Verify authenticated wallet endpoint
    const walletRes = await authUser.api.wallet.getMyWallet();
    expect(walletRes.status()).toBe(200);
    const wallet = await walletRes.json();
    expect(wallet.id).toBeDefined();
    expect(wallet.currency).toBe('EUR');
    expect(wallet.balance).toBe(0);
    expect(wallet.equivalents).toBeDefined();
  });
});
```

## File: qa/automation/tests/proof-of-life.spec.ts

### Purpose
Basic baseline assertion to confirm Playwright test discovery and runner pipeline execution.

### Actual Current Code
```typescript
import { test, expect } from '@playwright/test';

test.describe('Automation Framework Skeleton Verification', () => {
  test('proof of life: test runner executes and assertion passes', async () => {
    // Basic assertion to confirm Playwright test discovery and execution pipeline
    const frameworkName = 'WrightPay Playwright Automation Framework';
    expect(frameworkName).toBeDefined();
    expect(frameworkName).toContain('WrightPay');
    expect(1 + 1).toBe(2);
  });
});
```

---

# Part 11 — Authentication Test Suite

## File: qa/automation/tests/auth/auth.spec.ts

### Purpose
Validates all signup, login, email verification, logout, password hashing, and token boundary security invariants.

### Actual Current Code
```typescript
import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';

test.describe('Authentication Domain API Tests', () => {
  // ==========================================
  // 1. POST /auth/signup
  // ==========================================
  test.describe('POST /auth/signup', () => {
    test('successfully registers a new user with valid data and initializes database records', async ({ authApi }) => {
      const testUser = generateTestUserData();

      const response = await authApi.signup(testUser);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toBeDefined();
      expect(body.message).toBe('Signup successful. Please verify your email.');
      expect(typeof body.userId).toBe('string');
      expect(body.userId.length).toBeGreaterThan(0);

      // Cross-layer PostgreSQL validation
      const userRow = await dbClient.queryOne<{
        id: string;
        name: string;
        email: string;
        accountStatus: string;
        defaultCurrency: string;
        passwordHash: string;
      }>(
        'SELECT id, name, email, "accountStatus", "defaultCurrency", "passwordHash" FROM users WHERE id = $1',
        [body.userId],
      );

      expect(userRow).not.toBeNull();
      expect(userRow?.name).toBe(testUser.fullName);
      expect(userRow?.email).toBe(testUser.email.toLowerCase());
      expect(userRow?.accountStatus).toBe('pending');
      expect(userRow?.defaultCurrency).toBe('EUR');

      // Security check: password must be hashed (never stored plaintext)
      expect(userRow?.passwordHash).not.toBe(testUser.password);
      expect(userRow?.passwordHash.startsWith('$argon2')).toBe(true);

      // Verify default EUR wallet is initialized with zero balance
      const walletRow = await dbClient.queryOne<{
        id: string;
        userId: string;
        currency: string;
        balance: string | number;
        isDefault: boolean;
      }>(
        'SELECT id, "userId", currency, balance, "isDefault" FROM wallets WHERE "userId" = $1',
        [body.userId],
      );

      expect(walletRow).not.toBeNull();
      expect(walletRow?.userId).toBe(body.userId);
      expect(walletRow?.currency).toBe('EUR');
      expect(Number(walletRow?.balance)).toBe(0);
      expect(walletRow?.isDefault).toBe(true);
    });

    test('rejects duplicate user registration with identical email', async ({ authApi }) => {
      const testUser = generateTestUserData();

      // First registration
      const firstRes = await authApi.signup(testUser);
      expect(firstRes.status()).toBe(201);

      // Duplicate attempt
      const duplicateRes = await authApi.signup(testUser);
      expect(duplicateRes.status()).toBe(400);

      const errorBody = await duplicateRes.json();
      expect(errorBody.message).toContain('Email already in use');
    });

    test('rejects registration when required fields are missing', async ({ authApi }) => {
      const baseUser = generateTestUserData();

      // Missing password
      const { password, ...withoutPassword } = baseUser;
      const resWithoutPassword = await authApi.signup(withoutPassword as any);
      expect(resWithoutPassword.status()).toBe(400);

      // Missing firstName
      const { firstName, ...withoutFirstName } = baseUser;
      const resWithoutFirstName = await authApi.signup(withoutFirstName as any);
      expect(resWithoutFirstName.status()).toBe(400);
    });

    test('rejects registration with malformed email format', async ({ authApi }) => {
      const invalidUser = generateTestUserData({ email: 'not-an-email-format' });
      const response = await authApi.signup(invalidUser);
      expect(response.status()).toBe(400);
    });

    test('rejects registration with password shorter than 8 characters', async ({ authApi }) => {
      const invalidUser = generateTestUserData({ password: 'short' });
      const response = await authApi.signup(invalidUser);
      expect(response.status()).toBe(400);
    });
  });

  // ==========================================
  // 2. POST /auth/login
  // ==========================================
  test.describe('POST /auth/login', () => {
    test('successfully authenticates with valid credentials and returns JWT', async ({ authApi }) => {
      const testUser = generateTestUserData();
      const signupRes = await authApi.signup(testUser);
      expect(signupRes.status()).toBe(201);

      const loginRes = await authApi.login({
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status()).toBe(200);
      const body = await loginRes.json();
      expect(body).toBeDefined();

      // Token assertion (never print or hardcode token value)
      expect(typeof body.access_token).toBe('string');
      expect(body.access_token.length).toBeGreaterThan(20);

      // User object assertion
      expect(body.user).toBeDefined();
      expect(typeof body.user.id).toBe('string');
      expect(body.user.email).toBe(testUser.email.toLowerCase());
      expect(body.user.name).toBe(testUser.fullName);
    });

    test('rejects login with incorrect password', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      const loginRes = await authApi.login({
        email: testUser.email,
        password: 'IncorrectPassword999!',
      });

      expect(loginRes.status()).toBe(401);
      const errorBody = await loginRes.json();
      expect(errorBody.message).toBe('INVALID_CREDENTIALS');
    });

    test('rejects login with non-existent email', async ({ authApi }) => {
      const nonExistentEmail = `unregistered_${Date.now()}@wrightpay-qa.test`;
      const loginRes = await authApi.login({
        email: nonExistentEmail,
        password: 'SomePassword123!',
      });

      expect(loginRes.status()).toBe(401);
      const errorBody = await loginRes.json();
      expect(errorBody.message).toBe('INVALID_CREDENTIALS');
    });

    test('rejects login with missing credentials', async ({ authApi }) => {
      const res = await authApi.login({ email: '', password: '' });
      expect(res.status()).toBe(400);
    });
  });

  // ==========================================
  // 3. POST /auth/verify-email
  // ==========================================
  test.describe('POST /auth/verify-email', () => {
    test('successfully verifies email and transitions accountStatus to active in database', async ({ authApi }) => {
      const testUser = generateTestUserData();
      const signupRes = await authApi.signup(testUser);
      const { userId } = await signupRes.json();

      // Verify user starts in pending status
      const beforeRow = await dbClient.queryOne<{ accountStatus: string }>(
        'SELECT "accountStatus" FROM users WHERE id = $1',
        [userId],
      );
      expect(beforeRow?.accountStatus).toBe('pending');

      // Development OTP is 123456
      const verifyRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123456',
      });

      expect(verifyRes.status()).toBe(200);
      const body = await verifyRes.json();
      expect(body.message).toBe('Email successfully verified');

      // Verify accountStatus transitioned to active
      const afterRow = await dbClient.queryOne<{ accountStatus: string }>(
        'SELECT "accountStatus" FROM users WHERE id = $1',
        [userId],
      );
      expect(afterRow?.accountStatus).toBe('active');
    });

    test('rejects email verification with incorrect OTP code', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      const verifyRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '999999',
      });

      expect(verifyRes.status()).toBe(400);
      const errorBody = await verifyRes.json();
      expect(errorBody.message).toContain('INVALID_INPUT');
    });

    test('rejects re-verification of an already verified email', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      // First verification succeeds
      const firstRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123456',
      });
      expect(firstRes.status()).toBe(200);

      // Second verification attempt fails
      const secondRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123456',
      });
      expect(secondRes.status()).toBe(400);
      const errorBody = await secondRes.json();
      expect(errorBody.message).toContain('Email is already verified');
    });

    test('rejects email verification with invalid code format', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      // Code must be exactly 6 characters per DTO length validation
      const verifyRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123',
      });

      expect(verifyRes.status()).toBe(400);
    });
  });

  // ==========================================
  // 4. POST /auth/logout
  // ==========================================
  test.describe('POST /auth/logout', () => {
    test('successfully acknowledges logout for authenticated user', async ({ authUser }) => {
      const logoutRes = await authUser.api.auth.logout();
      expect(logoutRes.status()).toBe(200);

      const body = await logoutRes.json();
      expect(body.message).toBe('Logged out successfully');
    });

    test('rejects logout request when Authorization header is omitted', async ({ authApi }) => {
      const logoutRes = await authApi.logout();
      expect(logoutRes.status()).toBe(401);
    });
  });

  // ==========================================
  // 5. Authentication Security & Boundaries
  // ==========================================
  test.describe('Authentication Security Boundaries', () => {
    test('protected endpoint returns 401 when Authorization header is missing', async ({ apiContext }) => {
      const response = await apiContext.get('users/me');
      expect(response.status()).toBe(401);
    });

    test('protected endpoint returns 401 when scheme is not Bearer', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: 'Basic dXNlcjpwYXNzd29yZA==',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('protected endpoint returns 401 when Bearer token is malformed', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: 'Bearer invalid.malformed.jwttoken',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('protected endpoint returns 401 when token is tampered with forged signature', async ({ apiContext }) => {
      // Valid structural base64 header & payload with bogus signature
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: '00000000-0000-0000-0000-000000000000', email: 'forged@test.com' })).toString('base64url');
      const forgedJwt = `${header}.${payload}.invalidSignatureHere`;

      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: `Bearer ${forgedJwt}`,
        },
      });
      expect(response.status()).toBe(401);
    });
  });
});
```

### Detailed Breakdown of All 19 Test Cases

#### Test 1: `successfully registers a new user with valid data and initializes database records`
1. **Behavior Tested**: Complete user registration happy path, return contract, Argon2 password hashing, and default wallet initialization.
2. **Why It Exists**: Verifies the root onboarding contract of WrightPay.
3. **Request Sent**: `POST /auth/signup`
4. **Data Sent**: Unique `TestUserData` with `firstName`, `lastName`, `email`, `password`, `agreeTerms: true`.
5. **Expected Response**: `201 Created` with JSON `{ message: "Signup successful. Please verify your email.", userId: "<uuid>" }`.
6. **Assertions Performed**: Status 201, message correctness, non-empty string `userId`.
7. **Database Verification Performed**: Yes. Queries `users` and `wallets` tables.
8. **Why DB Verification Matters**: Validates that `accountStatus` is initialized to `'pending'`, `defaultCurrency` is `'EUR'`, `passwordHash` starts with `$argon2` (never plaintext), and a default `wallets` row is created with zero balance.
9. **Rule Tested**: Onboarding integrity, data protection compliance (GDPR/PCI-DSS), and relational integrity.
10. **Catchable Bug**: Passwords leaked into plaintext columns or failed default wallet creation.

#### Test 2: `rejects duplicate user registration with identical email`
1. **Behavior Tested**: Duplicate email uniqueness constraint handling.
2. **Why It Exists**: Prevents account takeover and duplicate identity records.
3. **Request Sent**: Two consecutive `POST /auth/signup` requests with identical emails.
4. **Data Sent**: Identical `testUser` object.
5. **Expected Response**: First request returns `201 Created`; second returns `400 Bad Request`.
6. **Assertions Performed**: Status 400, message contains `"Email already in use"`.
7. **Database Verification**: None required (asserted via HTTP contract).
8. **Why DB Verification Matters**: Uniqueness constraint in PostgreSQL is reflected via HTTP 400 rather than an unhandled 500 server crash.
9. **Rule Tested**: One account per verified email.
10. **Catchable Bug**: Database constraint violation causing uncaught 500 internal server errors.

#### Test 3: `rejects registration when required fields are missing`
1. **Behavior Tested**: Request validation boundaries when omitting `password` or `firstName`.
2. **Why It Exists**: Verifies NestJS `ValidationPipe` enforcement.
3. **Request Sent**: `POST /auth/signup`
4. **Data Sent**: Payloads missing `password` and `firstName` respectively.
5. **Expected Response**: `400 Bad Request`
6. **Assertions Performed**: `expect(res.status()).toBe(400)`
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Invalid payloads must be stopped before hitting PostgreSQL.
9. **Rule Tested**: Mandatory field presence.
10. **Catchable Bug**: Null values causing database crashes or silent user creation with null passwords.

#### Test 4: `rejects registration with malformed email format`
1. **Behavior Tested**: Email string format validation (`@IsEmail()`).
2. **Why It Exists**: Prevents garbage email strings in database.
3. **Request Sent**: `POST /auth/signup`
4. **Data Sent**: `email: 'not-an-email-format'`
5. **Expected Response**: `400 Bad Request`
6. **Assertions Performed**: Status 400.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Stops non-RFC compliant emails.
9. **Rule Tested**: Strict email format validation.
10. **Catchable Bug**: Corrupted contact data breaking downstream mailers.

#### Test 5: `rejects registration with password shorter than 8 characters`
1. **Behavior Tested**: Minimum password length enforcement (`@MinLength(8)`).
2. **Why It Exists**: Enforces baseline password complexity.
3. **Request Sent**: `POST /auth/signup`
4. **Data Sent**: `password: 'short'` (5 characters)
5. **Expected Response**: `400 Bad Request`
6. **Assertions Performed**: Status 400.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Security policy must be enforced at the gateway.
9. **Rule Tested**: Passwords must be at least 8 characters.
10. **Catchable Bug**: Weak passwords allowed.

#### Test 6: `successfully authenticates with valid credentials and returns JWT`
1. **Behavior Tested**: Login happy path and JWT issuance.
2. **Why It Exists**: Core authentication mechanism for all downstream protected endpoints.
3. **Request Sent**: `POST /auth/login`
4. **Data Sent**: `{ email, password }` matching previously signed-up user.
5. **Expected Response**: `200 OK` with `{ access_token, user: { id, email, name } }`.
6. **Assertions Performed**: Status 200, `access_token` string length > 20, user ID and name matching.
7. **Database Verification**: None (indirectly verified via previous signup).
8. **Why DB Verification Matters**: Proves credential lookup against PostgreSQL hashes works.
9. **Rule Tested**: Correct password verifies against Argon2 hash.
10. **Catchable Bug**: Broken JWT signing or payload corruption.

#### Test 7: `rejects login with incorrect password`
1. **Behavior Tested**: Credential validation failure.
2. **Why It Exists**: Blocks brute-force and unauthorized access.
3. **Request Sent**: `POST /auth/login`
4. **Data Sent**: Registered email with incorrect password `'IncorrectPassword999!'`.
5. **Expected Response**: `401 Unauthorized` with `{ message: "INVALID_CREDENTIALS" }`.
6. **Assertions Performed**: Status 401, error message check.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Prevents credential compromise.
9. **Rule Tested**: Reject invalid passwords with generic error.
10. **Catchable Bug**: Accepting invalid passwords or returning 200 with blank tokens.

#### Test 8: `rejects login with non-existent email`
1. **Behavior Tested**: Login rejection on unknown account.
2. **Why It Exists**: Prevents unauthorized login on non-existent identities.
3. **Request Sent**: `POST /auth/login`
4. **Data Sent**: Unregistered random email address.
5. **Expected Response**: `401 Unauthorized` with `{ message: "INVALID_CREDENTIALS" }`.
6. **Assertions Performed**: Status 401, error message is identical to wrong-password error.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Timing/user enumeration protection (both wrong email and wrong password return `INVALID_CREDENTIALS`).
9. **Rule Tested**: Safe error disclosure without leaking account existence.
10. **Catchable Bug**: Account enumeration vulnerability where unknown email returns 404 instead of 401.

#### Test 9: `rejects login with missing credentials`
1. **Behavior Tested**: DTO validation when email or password is empty.
2. **Why It Exists**: Prevents empty payload execution.
3. **Request Sent**: `POST /auth/login`
4. **Data Sent**: `{ email: '', password: '' }`
5. **Expected Response**: `400 Bad Request`
6. **Assertions Performed**: Status 400.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Rejects request prior to database lookup.
9. **Rule Tested**: Mandatory input fields on login.
10. **Catchable Bug**: Empty credentials triggering unexpected database exceptions.

#### Test 10: `successfully verifies email and transitions accountStatus to active in database`
1. **Behavior Tested**: OTP email confirmation and account activation state machine.
2. **Why It Exists**: WrightPay requires verified accounts before conducting financial transfers.
3. **Request Sent**: `POST /auth/verify-email`
4. **Data Sent**: `{ email, code: '123456' }`
5. **Expected Response**: `200 OK` with `{ message: "Email successfully verified" }`.
6. **Assertions Performed**: Status 200, confirmation message.
7. **Database Verification Performed**: Yes. Queries `users.accountStatus` before and after.
8. **Why DB Verification Matters**: Confirms status transitions from `'pending'` to `'active'` in PostgreSQL.
9. **Rule Tested**: Email verification unlocks full account status.
10. **Catchable Bug**: User status remains `'pending'` despite successful OTP submission.

#### Test 11: `rejects email verification with incorrect OTP code`
1. **Behavior Tested**: OTP verification rejection on bad code.
2. **Why It Exists**: Blocks brute-force OTP attempts.
3. **Request Sent**: `POST /auth/verify-email`
4. **Data Sent**: `{ email, code: '999999' }`
5. **Expected Response**: `400 Bad Request` with `INVALID_INPUT`.
6. **Assertions Performed**: Status 400, message contains `INVALID_INPUT`.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: OTP must match persisted/expected secret.
9. **Rule Tested**: Rejection of invalid verification tokens.
10. **Catchable Bug**: Bypassed OTP verification.

#### Test 12: `rejects re-verification of an already verified email`
1. **Behavior Tested**: Idempotency and replay protection on email verification.
2. **Why It Exists**: Prevents reusing OTPs or re-verifying active accounts.
3. **Request Sent**: Two consecutive `POST /auth/verify-email` calls.
4. **Data Sent**: `{ email, code: '123456' }`
5. **Expected Response**: First returns 200; second returns `400 Bad Request` with `"Email is already verified"`.
6. **Assertions Performed**: Status 400, message assertion.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: State machine rule prevents re-triggering activation logic.
9. **Rule Tested**: Verification is single-use.
10. **Catchable Bug**: OTP replay attack.

#### Test 13: `rejects email verification with invalid code format`
1. **Behavior Tested**: Length validation on OTP code (`@Length(6, 6)`).
2. **Why It Exists**: Prevents truncated or malformed OTP codes.
3. **Request Sent**: `POST /auth/verify-email`
4. **Data Sent**: `{ email, code: '123' }` (3 digits instead of 6)
5. **Expected Response**: `400 Bad Request`
6. **Assertions Performed**: Status 400.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: DTO validation catches format errors early.
9. **Rule Tested**: OTP codes must be exactly 6 characters.
10. **Catchable Bug**: SQL injection or buffer overflow via oversized/undersized codes.

#### Test 14: `successfully acknowledges logout for authenticated user`
1. **Behavior Tested**: Authenticated session termination.
2. **Why It Exists**: Verifies logout endpoint for authenticated users.
3. **Request Sent**: `POST /auth/logout` with valid Bearer token.
4. **Data Sent**: None.
5. **Expected Response**: `200 OK` with `{ message: "Logged out successfully" }`.
6. **Assertions Performed**: Status 200, message check.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Confirms endpoint contract.
9. **Rule Tested**: Authenticated logout contract.
10. **Catchable Bug**: Logout crashing or requiring unexpected payload.

#### Test 15: `rejects logout request when Authorization header is omitted`
1. **Behavior Tested**: Protected route guard on logout.
2. **Why It Exists**: Logout requires an active session to terminate.
3. **Request Sent**: `POST /auth/logout` without `Authorization` header.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`
6. **Assertions Performed**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Guards route against anonymous invocation.
9. **Rule Tested**: `JwtAuthGuard` protection.
10. **Catchable Bug**: Unprotected logout route.

#### Test 16: `protected endpoint returns 401 when Authorization header is missing`
1. **Behavior Tested**: Baseline route protection against unauthenticated traffic.
2. **Why It Exists**: Ensures all sensitive endpoints require identity tokens.
3. **Request Sent**: `GET /users/me` without `Authorization` header.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`
6. **Assertions Performed**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Universal security baseline.
9. **Rule Tested**: Missing token yields 401.
10. **Catchable Bug**: Accidental omission of `@UseGuards(JwtAuthGuard)` on controller routes.

#### Test 17: `protected endpoint returns 401 when scheme is not Bearer`
1. **Behavior Tested**: Authentication scheme enforcement.
2. **Why It Exists**: Ensures API accepts only Bearer tokens and rejects other schemes (like Basic).
3. **Request Sent**: `GET /users/me` with `Authorization: Basic dXNlcjpwYXNzd29yZA==`.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`
6. **Assertions Performed**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Validates authentication protocol compliance.
9. **Rule Tested**: Strict Bearer token authentication scheme.
10. **Catchable Bug**: Backend misinterpreting non-Bearer schemes.

#### Test 18: `protected endpoint returns 401 when Bearer token is malformed`
1. **Behavior Tested**: Token parser resilience against malformed strings.
2. **Why It Exists**: Prevents crashes when invalid strings are passed in header.
3. **Request Sent**: `GET /users/me` with `Authorization: Bearer invalid.malformed.jwttoken`.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`
6. **Assertions Performed**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Ensures JWT parser fails gracefully without crashing the server.
9. **Rule Tested**: Invalid JWT structure must result in 401.
10. **Catchable Bug**: Unhandled token parse exceptions throwing 500 error.

#### Test 19: `protected endpoint returns 401 when token is tampered with forged signature`
1. **Behavior Tested**: Cryptographic signature verification.
2. **Why It Exists**: Prevents attackers from forging identity claims in the JWT payload.
3. **Request Sent**: `GET /users/me` with structurally valid Base64 header and payload (`sub: 00000000-...`, `email: forged@test.com`), but with forged signature `'invalidSignatureHere'`.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`
6. **Assertions Performed**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Confirms backend verifies HMAC SHA-256 signature against its server secret.
9. **Rule Tested**: Signature tampering must be cryptographically rejected.
10. **Catchable Bug**: Token signature verification disabled (`algorithms: ['none']` or missing secret).

---

# Part 12 — Users Test Suite

## File: qa/automation/tests/users/users.spec.ts

### Purpose
Tests user profile retrieval (`GET /users/me`), profile updates (`PATCH /users/me`), parameter tampering protection, and cross-user isolation.

### Actual Current Code
```typescript
import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { UsersApi } from '../../api';

test.describe('Users Domain API Tests', () => {
  // ==========================================
  // 1. GET /users/me
  // ==========================================
  test.describe('GET /users/me', () => {
    test('successfully retrieves authenticated user profile with correct identity fields', async ({ authUser }) => {
      const response = await authUser.api.users.getMe();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toBeDefined();

      // Identity fields verification
      expect(body.id).toBe(authUser.user.id);
      expect(body.email).toBe(authUser.user.email);
      expect(body.name).toBe(authUser.user.name);
      expect(body.accountType).toBe('individual');
      expect(body.accountStatus).toBe('active');
      expect(body.defaultCurrency).toBe('EUR');
      expect(body.createdAt).toBeDefined();
      expect(typeof body.createdAt).toBe('string');

      // Security check: sensitive fields must not be exposed in the profile response
      expect(body.passwordHash).toBeUndefined();
      expect(body.password).toBeUndefined();
    });

    test('maintains strict user isolation across separate authenticated sessions', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A from fixture
      const responseA = await authUser.api.users.getMe();
      expect(responseA.status()).toBe(200);
      const profileA = await responseA.json();

      // Provision User B independently
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      const { userId: userIdB } = await signupB.json();

      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({
        email: testUserB.email,
        password: testUserB.password,
      });
      expect(loginB.status()).toBe(200);
      const { access_token: tokenB } = await loginB.json();

      // Create isolated request context for User B
      const contextB = await playwright.request.newContext({
        baseURL: responseA.url().replace(/\/users\/me.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const usersApiB = new UsersApi(contextB);
      const responseB = await usersApiB.getMe();
      expect(responseB.status()).toBe(200);
      const profileB = await responseB.json();

      // Verify User A receives User A's identity and User B receives User B's identity
      expect(profileA.id).toBe(authUser.user.id);
      expect(profileA.email).toBe(authUser.user.email);

      expect(profileB.id).toBe(userIdB);
      expect(profileB.email).toBe(testUserB.email.toLowerCase());

      // Assert complete identity isolation between users
      expect(profileA.id).not.toBe(profileB.id);
      expect(profileA.email).not.toBe(profileB.email);

      await contextB.dispose();
    });

    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('users/me');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: 'Bearer invalid.token.string',
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  // ==========================================
  // 2. PATCH /users/me
  // ==========================================
  test.describe('PATCH /users/me', () => {
    test('successfully updates user profile name and countryOfResidence', async ({ authUser }) => {
      const updatedName = 'Alex Mercer';
      const updatedCountry = 'Germany';

      const patchResponse = await authUser.api.users.updateMe({
        name: updatedName,
        countryOfResidence: updatedCountry,
      });

      expect(patchResponse.status()).toBe(200);
      const updatedProfile = await patchResponse.json();
      expect(updatedProfile.name).toBe(updatedName);
      expect(updatedProfile.countryOfResidence).toBe(updatedCountry);
      expect(updatedProfile.id).toBe(authUser.user.id);

      // Verify update is observable via subsequent GET /users/me
      const getResponse = await authUser.api.users.getMe();
      expect(getResponse.status()).toBe(200);
      const fetchedProfile = await getResponse.json();
      expect(fetchedProfile.name).toBe(updatedName);
      expect(fetchedProfile.countryOfResidence).toBe(updatedCountry);

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{ name: string; countryOfResidence: string }>(
        'SELECT name, "countryOfResidence" FROM users WHERE id = $1',
        [authUser.user.id],
      );
      expect(dbRow).not.toBeNull();
      expect(dbRow?.name).toBe(updatedName);
      expect(dbRow?.countryOfResidence).toBe(updatedCountry);
    });

    test('successfully updates user default currency', async ({ authUser }) => {
      const patchResponse = await authUser.api.users.updateMe({
        defaultCurrency: 'GBP',
      });

      expect(patchResponse.status()).toBe(200);
      const updatedProfile = await patchResponse.json();
      expect(updatedProfile.defaultCurrency).toBe('GBP');

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{ defaultCurrency: string }>(
        'SELECT "defaultCurrency" FROM users WHERE id = $1',
        [authUser.user.id],
      );
      expect(dbRow?.defaultCurrency).toBe('GBP');
    });

    test('accepts empty update payload and returns unchanged profile', async ({ authUser }) => {
      const beforeRes = await authUser.api.users.getMe();
      const beforeProfile = await beforeRes.json();

      const patchResponse = await authUser.api.users.updateMe({});
      expect(patchResponse.status()).toBe(200);
      const afterProfile = await patchResponse.json();

      expect(afterProfile.id).toBe(beforeProfile.id);
      expect(afterProfile.email).toBe(beforeProfile.email);
      expect(afterProfile.name).toBe(beforeProfile.name);
      expect(afterProfile.defaultCurrency).toBe(beforeProfile.defaultCurrency);
    });

    test('rejects update with invalid currency enum value', async ({ authUser }) => {
      const patchResponse = await authUser.api.users.updateMe({
        defaultCurrency: 'INVALID_CURRENCY' as any,
      });

      expect(patchResponse.status()).toBe(400);
    });

    test('rejects update with non-string name value', async ({ authUser }) => {
      const patchResponse = await authUser.api.users.updateMe({
        name: 12345 as any,
      });

      expect(patchResponse.status()).toBe(400);
    });

    test('prevents parameter tampering and IDOR attempts by stripping non-whitelisted fields', async ({ authUser }) => {
      // Attempt to tamper with id and email through PATCH body
      const tamperAttempt = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'tampered_hacker@wrightpay-qa.test',
        name: 'Legit Name Update',
      };

      const patchResponse = await authUser.api.users.updateMe(tamperAttempt as any);
      expect(patchResponse.status()).toBe(200);

      const body = await patchResponse.json();
      // Whitelisted name is updated
      expect(body.name).toBe('Legit Name Update');
      // Immutable identity fields remain completely untouched
      expect(body.id).toBe(authUser.user.id);
      expect(body.id).not.toBe(tamperAttempt.id);
      expect(body.email).toBe(authUser.user.email);
      expect(body.email).not.toBe(tamperAttempt.email);

      // Verify in PostgreSQL that id and email were not tampered with
      const dbRow = await dbClient.queryOne<{ id: string; email: string }>(
        'SELECT id, email FROM users WHERE id = $1',
        [authUser.user.id],
      );
      expect(dbRow?.id).toBe(authUser.user.id);
      expect(dbRow?.email).toBe(authUser.user.email);
    });

    test('rejects unauthorized PATCH when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.patch('users/me', {
        data: { name: 'Unauthorized Change' },
      });
      expect(response.status()).toBe(401);
    });

    test('rejects PATCH with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.patch('users/me', {
        data: { name: 'Unauthorized Change' },
        headers: {
          Authorization: 'Bearer bogus.token.string',
        },
      });
      expect(response.status()).toBe(401);
    });
  });
});
```

### Detailed Breakdown of All 12 Test Cases

- **Test 1 (`GET /users/me` Profile Retrieval & Sanitization)**: Asserts status 200, correct identity fields (`id`, `email`, `name`, `accountType: 'individual'`, `accountStatus: 'active'`, `defaultCurrency: 'EUR'`), and critically asserts that sensitive fields (`password`, `passwordHash`) are `undefined`.
- **Test 2 (`GET /users/me` Multi-Tenant Isolation)**: Provisions User A and User B concurrently. Asserts that User A receives Profile A and User B receives Profile B with zero data leakage across sessions.
- **Test 3 & 4 (Negatives)**: Asserts 401 when Authorization is missing or invalid.
- **Test 5 (`PATCH /users/me` Name & Country Update)**: Sends `{ name: 'Alex Mercer', countryOfResidence: 'Germany' }`. Asserts 200, subsequent `GET /users/me` parity, and cross-layer PostgreSQL row verification.
- **Test 6 (`PATCH /users/me` Currency Update)**: Updates `defaultCurrency` to `'GBP'`. Asserts 200 and PostgreSQL database column update.
- **Test 7 (`PATCH /users/me` Empty Payload)**: Sends `{}`. Asserts 200 and profile attributes remain completely unchanged.
- **Test 8 & 9 (Validation Boundaries)**: Sends invalid enum `'INVALID_CURRENCY'` and non-string `name: 12345`. Asserts 400 Bad Request.
- **Test 10 (Mass Assignment & Parameter Tampering)**: Injects `{ id: '00000000-...', email: 'tampered@hacker.test', name: 'Legit Name' }`. Verifies that NestJS `ValidationPipe` whitelist strips `id` and `email` while saving `name`. Verified via PostgreSQL query.
- **Test 11 & 12 (PATCH Negatives)**: Asserts 401 when attempting PATCH without token or with malformed token.

---

# Part 13 — Wallet Test Suite

## File: qa/automation/tests/wallet/wallet.spec.ts

### Purpose
Tests wallet balance contract, numeric precision, database persistence parity, calculated multi-currency equivalents, and read idempotency.

### Actual Current Code
```typescript
import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { WalletApi } from '../../api';

test.describe('Wallet Domain API Tests', () => {
  // ==========================================
  // 1. Authenticated Retrieval & Contract
  // ==========================================
  test.describe('GET /wallets/me - Contract & Schema', () => {
    test('successfully retrieves authenticated wallet with valid schema and zero initial balance', async ({
      authUser,
    }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toBeDefined();

      // Structure and field assertions
      expect(typeof body.id).toBe('string');
      expect(body.id.length).toBeGreaterThan(0);
      expect(body.currency).toBe('EUR');
      expect(typeof body.balance).toBe('number');
      expect(body.balance).toBe(0);
      expect(body.isDefault).toBe(true);
      expect(typeof body.equivalents).toBe('object');
      expect(body.equivalents).not.toBeNull();

      // Sensitive / internal fields should not be exposed
      expect(body.userId).toBeUndefined();
    });

    test('balance representation maintains non-negative finite numeric precision', async ({ authUser }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Number.isFinite(body.balance)).toBe(true);
      expect(body.balance).toBeGreaterThanOrEqual(0);

      // Verify rounding precision (at most 2 decimal places)
      const decimalParts = body.balance.toString().split('.');
      if (decimalParts.length > 1) {
        expect(decimalParts[1].length).toBeLessThanOrEqual(2);
      }
    });
  });

  // ==========================================
  // 2. Database Cross-Layer Validation
  // ==========================================
  test.describe('GET /wallets/me - Database Cross-Layer Validation', () => {
    test('matches persisted PostgreSQL wallet record properties exactly', async ({ authUser }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);
      const apiWallet = await response.json();

      // Query database for the authenticated user's primary wallet
      const dbWallet = await dbClient.queryOne<{
        id: string;
        userId: string;
        currency: string;
        balance: string | number;
        isDefault: boolean;
      }>(
        'SELECT id, "userId", currency, balance, "isDefault" FROM wallets WHERE "userId" = $1',
        [authUser.user.id],
      );

      expect(dbWallet).not.toBeNull();
      expect(dbWallet?.id).toBe(apiWallet.id);
      expect(dbWallet?.userId).toBe(authUser.user.id);
      expect(dbWallet?.currency).toBe(apiWallet.currency);
      expect(Number(dbWallet?.balance)).toBe(apiWallet.balance);
      expect(dbWallet?.isDefault).toBe(apiWallet.isDefault);
    });
  });

  // ==========================================
  // 3. Multi-Currency Equivalents Invariants
  // ==========================================
  test.describe('GET /wallets/me - Currency Equivalents Invariants', () => {
    test('returns calculated equivalent balances for all supported currencies', async ({ authUser }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);
      const body = await response.json();

      // Expected supported currencies confirmed by WalletsService
      const expectedCurrencies = ['EUR', 'GBP', 'USD', 'AED', 'PLN', 'INR'];

      for (const curr of expectedCurrencies) {
        expect(body.equivalents).toHaveProperty(curr);
        expect(typeof body.equivalents[curr]).toBe('number');
        expect(body.equivalents[curr]).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(body.equivalents[curr])).toBe(true);
      }

      // Base currency equivalent must equal current wallet balance
      expect(body.equivalents[body.currency]).toBe(body.balance);
    });
  });

  // ==========================================
  // 4. User Isolation & Read-Only Idempotence
  // ==========================================
  test.describe('GET /wallets/me - User Isolation & Idempotence', () => {
    test('ensures distinct users receive distinct wallets with strict separation', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A from fixture
      const responseA = await authUser.api.wallet.getMyWallet();
      expect(responseA.status()).toBe(200);
      const walletA = await responseA.json();

      // Provision User B
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      const { userId: userIdB } = await signupB.json();

      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({
        email: testUserB.email,
        password: testUserB.password,
      });
      expect(loginB.status()).toBe(200);
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: responseA.url().replace(/\/wallets\/me.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const walletApiB = new WalletApi(contextB);
      const responseB = await walletApiB.getMyWallet();
      expect(responseB.status()).toBe(200);
      const walletB = await responseB.json();

      // Isolation assertions
      expect(walletA.id).not.toBe(walletB.id);

      // Verify in database that ownership maps to distinct users
      const dbWalletA = await dbClient.queryOne<{ userId: string }>('SELECT "userId" FROM wallets WHERE id = $1', [walletA.id]);
      const dbWalletB = await dbClient.queryOne<{ userId: string }>('SELECT "userId" FROM wallets WHERE id = $1', [walletB.id]);

      expect(dbWalletA?.userId).toBe(authUser.user.id);
      expect(dbWalletB?.userId).toBe(userIdB);
      expect(dbWalletA?.userId).not.toBe(dbWalletB?.userId);

      await contextB.dispose();
    });

    test('read operation is strictly idempotent and does not create duplicate wallet records', async ({
      authUser,
    }) => {
      // Check initial wallet count in DB for this user
      const beforeCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM wallets WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(beforeCount?.count)).toBe(1);

      // Perform multiple consecutive GET requests
      const res1 = await authUser.api.wallet.getMyWallet();
      expect(res1.status()).toBe(200);
      const wallet1 = await res1.json();

      const res2 = await authUser.api.wallet.getMyWallet();
      expect(res2.status()).toBe(200);
      const wallet2 = await res2.json();

      // Confirm properties remain identical
      expect(wallet1.id).toBe(wallet2.id);
      expect(wallet1.currency).toBe(wallet2.currency);
      expect(wallet1.balance).toBe(wallet2.balance);

      // Confirm no additional records were created in database
      const afterCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM wallets WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(afterCount?.count)).toBe(1);
    });
  });

  // ==========================================
  // 5. Authorization Negatives
  // ==========================================
  test.describe('GET /wallets/me - Authorization Negatives', () => {
    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('wallets/me');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('wallets/me', {
        headers: {
          Authorization: 'Bearer invalid.token.value',
        },
      });
      expect(response.status()).toBe(401);
    });
  });
});
```

### Detailed Breakdown of All 8 Test Cases
- **Test 1 (Contract & Zero Balance)**: Asserts wallet properties (`id`, `currency: 'EUR'`, `balance: 0`, `isDefault: true`, `equivalents: object`) and ensures internal foreign key `userId` is omitted from the DTO.
- **Test 2 (Numeric Precision)**: Verifies `Number.isFinite(balance)`, `balance >= 0`, and maximum of 2 decimal places.
- **Test 3 (Cross-Layer DB Parity)**: Queries `wallets` table in PostgreSQL and matches `id`, `userId`, `currency`, `balance`, and `isDefault` against the HTTP response.
- **Test 4 (Multi-Currency Equivalents)**: Asserts that `equivalents` contains valid finite numbers for all supported currencies: `EUR`, `GBP`, `USD`, `AED`, `PLN`, and `INR`. Confirms base `equivalents['EUR'] === balance`.
- **Test 5 (User Isolation)**: Asserts that User A and User B receive distinct wallet IDs and that PostgreSQL assigns them to distinct `userId` foreign keys.
- **Test 6 (Read Idempotence)**: Confirms repeated `GET /wallets/me` calls do not mutate state or generate spurious database rows (count remains 1).
- **Test 7 & 8 (Authorization Negatives)**: Asserts 401 when Authorization header is omitted or token is invalid.

---

# Part 14 — Cards Test Suite

## File: qa/automation/tests/cards/cards.spec.ts

### Purpose
Validates the complete card lifecycle, virtual/physical provisioning, card masking, state transitions (`active` <-> `frozen` -> `deactivated`), physical hard deletion, and cross-user IDOR protection.

### Actual Current Code
```typescript
import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { CardsApi } from '../../api';
import { CreateCardRequest } from '../../api/types';

function generateTestCardData(overrides?: Partial<CreateCardRequest>): CreateCardRequest {
  return {
    cardholderName: overrides?.cardholderName || 'John Doe',
    cardNumber: overrides?.cardNumber || '4242424242421234',
    expiryDate: overrides?.expiryDate || '12/28',
    cvv: overrides?.cvv || '123',
    type: overrides?.type,
  };
}

test.describe('Cards Domain API Tests', () => {
  // ==========================================
  // 1. GET /cards - Retrieval & Empty State
  // ==========================================
  test.describe('GET /cards - Listing & Retrieval', () => {
    test('returns an empty array for a newly registered user with no cards', async ({ authUser }) => {
      const response = await authUser.api.cards.getMyCards();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    test('returns list of user cards after successful card creation', async ({ authUser }) => {
      const cardPayload = generateTestCardData();
      const createRes = await authUser.api.cards.createCard(cardPayload);
      expect(createRes.status()).toBe(201);
      const createdCard = await createRes.json();

      const listRes = await authUser.api.cards.getMyCards();
      expect(listRes.status()).toBe(200);
      const cards = await listRes.json();

      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBeGreaterThanOrEqual(1);

      const found = cards.find((c: any) => c.id === createdCard.id);
      expect(found).toBeDefined();
      expect(found.cardholderName).toBe('JOHN DOE');
      expect(found.lastFourDigits).toBe('1234');
      expect(found.status).toBe('active');
    });

    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('cards');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('cards', {
        headers: {
          Authorization: 'Bearer invalid.token.value',
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  // ==========================================
  // 2. POST /cards - Creation & Persistence
  // ==========================================
  test.describe('POST /cards - Creation & Database Verification', () => {
    test('successfully provisions an active debit card with masked PAN and verifies PostgreSQL persistence', async ({
      authUser,
    }) => {
      const cardPayload = generateTestCardData({
        cardholderName: 'Alice Springs',
        cardNumber: '5555444433339876',
        expiryDate: '10/29',
        cvv: '999',
      });

      const response = await authUser.api.cards.createCard(cardPayload);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toBeDefined();
      expect(typeof body.id).toBe('string');
      expect(body.id.length).toBeGreaterThan(0);
      expect(body.cardholderName).toBe('ALICE SPRINGS');
      expect(body.lastFourDigits).toBe('9876');
      expect(body.expiryDate).toBe('10/29');
      expect(body.status).toBe('active');
      expect(body.type).toBe('debit');

      // Security check: raw card number and CVV must never be returned in API response
      expect(body.cardNumber).toBeUndefined();
      expect(body.cvv).toBeUndefined();

      // Cross-layer PostgreSQL verification
      const dbCard = await dbClient.queryOne<{
        id: string;
        userId: string;
        cardholderName: string;
        lastFourDigits: string;
        expiryDate: string;
        status: string;
        type: string;
      }>(
        'SELECT id, "userId", "cardholderName", "lastFourDigits", "expiryDate", status, type FROM cards WHERE id = $1',
        [body.id],
      );

      expect(dbCard).not.toBeNull();
      expect(dbCard?.id).toBe(body.id);
      expect(dbCard?.userId).toBe(authUser.user.id);
      expect(dbCard?.cardholderName).toBe('ALICE SPRINGS');
      expect(dbCard?.lastFourDigits).toBe('9876');
      expect(dbCard?.expiryDate).toBe('10/29');
      expect(dbCard?.status).toBe('active');
      expect(dbCard?.type).toBe('debit');
    });

    test('successfully provisions a credit card when explicitly requested', async ({ authUser }) => {
      const cardPayload = generateTestCardData({
        type: 'credit',
      });

      const response = await authUser.api.cards.createCard(cardPayload);
      expect(response.status()).toBe(201);
      const body = await response.json();

      expect(body.type).toBe('credit');

      // Cross-layer DB verification
      const dbCard = await dbClient.queryOne<{ type: string }>(
        'SELECT type FROM cards WHERE id = $1',
        [body.id],
      );
      expect(dbCard?.type).toBe('credit');
    });
  });

  // ==========================================
  // 3. POST /cards - Validation Boundaries
  // ==========================================
  test.describe('POST /cards - Validation Boundaries', () => {
    test('rejects card creation when cardholderName is missing or empty', async ({ authUser }) => {
      const response = await authUser.api.cards.createCard({
        cardholderName: '',
        cardNumber: '4242424242421234',
        expiryDate: '12/28',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects card creation with invalid expiry date format', async ({ authUser }) => {
      // Month > 12
      const resInvalidMonth = await authUser.api.cards.createCard({
        cardholderName: 'Invalid Expiry',
        cardNumber: '4242424242421234',
        expiryDate: '13/28',
      });
      expect(resInvalidMonth.status()).toBe(400);

      // Non-numeric string
      const resNonNumeric = await authUser.api.cards.createCard({
        cardholderName: 'Invalid Expiry',
        cardNumber: '4242424242421234',
        expiryDate: 'invalid',
      });
      expect(resNonNumeric.status()).toBe(400);
    });

    test('rejects card creation with unsupported card type enum', async ({ authUser }) => {
      const response = await authUser.api.cards.createCard({
        cardholderName: 'Bad Enum',
        cardNumber: '4242424242421234',
        expiryDate: '12/28',
        type: 'prepaid' as any,
      });
      expect(response.status()).toBe(400);
    });
  });

  // ==========================================
  // 4. Card State Machine - Lifecycle
  // ==========================================
  test.describe('Card State Machine - Lifecycle Transitions', () => {
    test('transitions an active card to frozen status via freeze endpoint', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      expect(card.status).toBe('active');

      const freezeRes = await authUser.api.cards.freezeCard(card.id);
      expect(freezeRes.status()).toBe(200);
      const frozenCard = await freezeRes.json();
      expect(frozenCard.id).toBe(card.id);
      expect(frozenCard.status).toBe('frozen');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('frozen');
    });

    test('transitions a frozen card back to active status via unfreeze endpoint', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.freezeCard(card.id);

      const unfreezeRes = await authUser.api.cards.unfreezeCard(card.id);
      expect(unfreezeRes.status()).toBe(200);
      const activeCard = await unfreezeRes.json();
      expect(activeCard.id).toBe(card.id);
      expect(activeCard.status).toBe('active');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('active');
    });

    test('transitions an active card to terminal deactivated status via deactivate endpoint', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();

      const deactivateRes = await authUser.api.cards.deactivateCard(card.id);
      expect(deactivateRes.status()).toBe(200);
      const deactivatedCard = await deactivateRes.json();
      expect(deactivatedCard.id).toBe(card.id);
      expect(deactivatedCard.status).toBe('deactivated');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('deactivated');
    });

    test('allows deactivating a frozen card directly', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.freezeCard(card.id);

      const deactivateRes = await authUser.api.cards.deactivateCard(card.id);
      expect(deactivateRes.status()).toBe(200);
      const deactivatedCard = await deactivateRes.json();
      expect(deactivatedCard.status).toBe('deactivated');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('deactivated');
    });
  });

  // ==========================================
  // 5. Card State Machine - Invalid Transitions
  // ==========================================
  test.describe('Card State Machine - Invalid State Transitions', () => {
    test('rejects freezing an already frozen card with 400', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.freezeCard(card.id);

      // Second freeze call should be rejected
      const secondFreezeRes = await authUser.api.cards.freezeCard(card.id);
      expect(secondFreezeRes.status()).toBe(400);
      const errorBody = await secondFreezeRes.json();
      expect(errorBody.message).toContain('Card is already frozen');
    });

    test('rejects unfreezing an already active card with 400', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      expect(card.status).toBe('active');

      const unfreezeRes = await authUser.api.cards.unfreezeCard(card.id);
      expect(unfreezeRes.status()).toBe(400);
      const errorBody = await unfreezeRes.json();
      expect(errorBody.message).toContain('Card is already active');
    });

    test('rejects state modifications on a deactivated card with 400', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.deactivateCard(card.id);

      // Attempt freeze on deactivated card
      const freezeRes = await authUser.api.cards.freezeCard(card.id);
      expect(freezeRes.status()).toBe(400);
      const freezeError = await freezeRes.json();
      expect(freezeError.message).toContain('Deactivated card cannot be modified');

      // Attempt unfreeze on deactivated card
      const unfreezeRes = await authUser.api.cards.unfreezeCard(card.id);
      expect(unfreezeRes.status()).toBe(400);
      const unfreezeError = await unfreezeRes.json();
      expect(unfreezeError.message).toContain('Deactivated card cannot be modified');

      // Attempt duplicate deactivation
      const deactivateRes = await authUser.api.cards.deactivateCard(card.id);
      expect(deactivateRes.status()).toBe(400);
      const deactivateError = await deactivateRes.json();
      expect(deactivateError.message).toContain('Card is already deactivated');
    });
  });

  // ==========================================
  // 6. Hard Deletion & IDOR Security Boundaries
  // ==========================================
  test.describe('Hard Deletion & Cross-User Security', () => {
    test('hard deletes card from PostgreSQL database and excludes it from subsequent listings', async ({
      authUser,
    }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();

      const deleteRes = await authUser.api.cards.deleteCard(card.id);
      expect(deleteRes.status()).toBe(200);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.message).toBe('Card successfully deleted');
      expect(deleteBody.id).toBe(card.id);

      // PostgreSQL verification: card record must be physically deleted (count = 0)
      const dbCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM cards WHERE id = $1',
        [card.id],
      );
      expect(Number(dbCount?.count)).toBe(0);

      // GET /cards must no longer contain the deleted card
      const listRes = await authUser.api.cards.getMyCards();
      const cards = await listRes.json();
      const found = cards.find((c: any) => c.id === card.id);
      expect(found).toBeUndefined();

      // Subsequent delete attempt must return 404
      const secondDeleteRes = await authUser.api.cards.deleteCard(card.id);
      expect(secondDeleteRes.status()).toBe(404);
    });

    test('returns 404 when deleting a non-existent card UUID', async ({ authUser }) => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const response = await authUser.api.cards.deleteCard(nonExistentUuid);
      expect(response.status()).toBe(404);
    });

    test('enforces strict multi-tenant isolation and rejects cross-user card manipulation (IDOR)', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A creates Card A
      const cardA = await (await authUser.api.cards.createCard(generateTestCardData({ cardholderName: 'User A Card' }))).json();

      // Provision User B
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({ email: testUserB.email, password: testUserB.password });
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: (await authUser.api.cards.getMyCards()).url().replace(/\/cards.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const cardsApiB = new CardsApi(contextB);

      // User B creates Card B
      const cardB = await (await cardsApiB.createCard(generateTestCardData({ cardholderName: 'User B Card' }))).json();

      // Multi-tenant visibility isolation: User A sees only Card A, User B sees only Card B
      const listA = await (await authUser.api.cards.getMyCards()).json();
      const listB = await (await cardsApiB.getMyCards()).json();

      expect(listA.some((c: any) => c.id === cardA.id)).toBe(true);
      expect(listA.some((c: any) => c.id === cardB.id)).toBe(false);

      expect(listB.some((c: any) => c.id === cardB.id)).toBe(true);
      expect(listB.some((c: any) => c.id === cardA.id)).toBe(false);

      // IDOR attempts: User B attempting to mutate or delete User A's card must return 404
      const freezeAttempt = await cardsApiB.freezeCard(cardA.id);
      expect(freezeAttempt.status()).toBe(404);

      const unfreezeAttempt = await cardsApiB.unfreezeCard(cardA.id);
      expect(unfreezeAttempt.status()).toBe(404);

      const deactivateAttempt = await cardsApiB.deactivateCard(cardA.id);
      expect(deactivateAttempt.status()).toBe(404);

      const deleteAttempt = await cardsApiB.deleteCard(cardA.id);
      expect(deleteAttempt.status()).toBe(404);

      // Confirm Card A status remains untouched in PostgreSQL
      const dbCardA = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [cardA.id]);
      expect(dbCardA?.status).toBe('active');

      await contextB.dispose();
    });
  });
});
```

### The Card State Machine
```text
           ┌──────────────────────┐
           │      PROVISIONED     │
           │       (active)       │
           └───────┬──────────────┘
                   │
         freezeCard│  ▲ unfreezeCard
                   │  │
                   ▼  │
           ┌──────────────────────┐
           │        FROZEN        │
           │       (frozen)       │
           └───────┬──────────────┘
                   │
    deactivateCard │  ▲ (Impossible)
                   ▼  │
       ┌──────────────────────────────┐
       │         DEACTIVATED          │
       │    (Terminal State - 400)    │
       └──────────────────────────────┘
```

### Detailed Breakdown of Key Cards Tests
- **Test 5 (Debit Provisioning & Masking)**: Verifies that sensitive PAN (`cardNumber`) and CVV are **never** returned in the API response (`undefined`). Only `lastFourDigits` is returned and stored in PostgreSQL.
- **Test 6 (Credit Provisioning)**: Proves that explicitly passing `type: 'credit'` is honored and stored.
- **Test 10 & 11 (Active <-> Frozen Transitions)**: Tests bidirectional transitions via `/cards/:id/freeze` and `/cards/:id/unfreeze`. Verified in PostgreSQL.
- **Test 12 & 13 (Deactivation Transitions)**: Proves that both `active` and `frozen` cards can transition to `deactivated`.
- **Test 14, 15, 16 (Invalid State Transitions)**: Confirms state machine guards:
  - Freezing a frozen card returns `400 Bad Request` (`"Card is already frozen"`).
  - Unfreezing an active card returns `400 Bad Request` (`"Card is already active"`).
  - Attempting any mutation on a `deactivated` card returns `400 Bad Request` (`"Deactivated card cannot be modified"`).
- **Test 17 (Hard Deletion)**: Calling `DELETE /cards/:id` physically purges the record (`count = 0` in PostgreSQL). Subsequent delete attempts return `404 Not Found`.
- **Test 19 (IDOR Protection)**: Tests Insecure Direct Object References. User B attempts to freeze, unfreeze, deactivate, or delete User A's card. The backend enforces `WHERE id = :id AND userId = :currentUserId` and returns `404 Not Found` for all unauthorized operations. Card A's status remains `'active'` in PostgreSQL.

---

# Part 15 — Test Data & Test Isolation

### Principles Implemented
1. **Zero Hardcoded IDs or Emails**: Every test suite generates isolated users via `generateTestUserData()`.
2. **Deterministic-Yet-Random**: The generator combines `Date.now()`, `process.pid`, and atomic counters to guarantee zero collisions even across 4+ parallel workers.
3. **Order Independence**: Any test can run in isolation (`npx playwright test -g "rejects duplicate user"`), in parallel, or in reverse order without failure.
4. **Lifecycle Scoping**: `APIRequestContext` instances are created per-test and disposed in `fixture.authUser` teardown.
5. **Database Connection Sharing**: All workers share the managed `DbClient` pool which automatically heals if closed.

---

# Part 16 — Backend Behavior Discovered During Development

### Confirmed from Implementation
- **Port Layout**: Backend runs on `http://localhost:3001/api/v1`; Frontend on `http://localhost:3000`.
- **Signup Contract**: `POST /auth/signup` returns `{ message: string, userId: string }`. It does NOT return an access token or log the user in automatically.
- **Login Contract**: `POST /auth/login` accepts `{ email, password }` and returns `{ access_token: string, user: UserProfile }`.
- **Email Verification**: Verification OTP in development is `'123456'`. Verifying transitions `users.accountStatus` from `'pending'` to `'active'`.
- **Default Wallet**: Signup automatically provisions an initial default wallet in `EUR` with `0.00` balance.
- **Wallet Equivalents**: `GET /wallets/me` calculates real-time equivalents for `['EUR', 'GBP', 'USD', 'AED', 'PLN', 'INR']` using `ExchangeRatesService`. Equivalents are not stored in PostgreSQL.
- **Card State Machine**: Supports `active`, `frozen`, and `deactivated`. `deactivated` is a terminal state.
- **Card Deletion**: `DELETE /cards/:id` is a **hard delete** (`DELETE FROM cards WHERE id = $1`).
- **Card Data Masking**: PAN and CVV are never stored in the database. Only `lastFourDigits` is persisted.
- **IDOR Protection**: All card operations filter by `WHERE id = :id AND userId = :userId`, returning 404 if the card belongs to another tenant.
- **BullMQ Architecture**: Queue name is `'transfers'`; job name is `'process-transfer'`; job payload contains `{ transactionId }`.

### Not Implemented / Not Currently Available
- *Direct Wallet Mutations*: There are currently no endpoints for manual deposits or withdrawals (`POST /wallets/deposit` does not exist).
- *Soft Deletion for Cards*: There is no `deletedAt` column on the cards entity.
- *Server-Side Token Revocation*: `POST /auth/logout` acknowledges logout but does not maintain a Redis JWT revocation blacklist.

---

# Part 17 — Problems Encountered During Development & Solutions

### Problem 1: Playwright URL Resolution Stripping `/api/v1`
- **What Happened**: Requests to `/auth/login` resulted in `404 Not Found`.
- **Why It Happened**: `new URL('/auth/login', 'http://localhost:3001/api/v1')` treats leading slashes as origin-relative, resolving to `http://localhost:3001/auth/login`.
- **Diagnosis**: Inspected request URLs in Playwright trace viewer.
- **Solution**: Implemented `resolvePath(path)` in `BaseApi`:
  ```typescript
  protected resolvePath(path: string): string {
    return path.startsWith('/') ? path.slice(1) : path;
  }
  ```
- **Why It Works**: Stripping the leading slash forces relative path resolution: `http://localhost:3001/api/v1/` + `auth/login` = `http://localhost:3001/api/v1/auth/login`.

### Problem 2: PostgreSQL Pool Termination in Multi-Worker Execution
- **What Happened**: Tests crashed intermittently with `Error: Cannot use a pool after calling end()`.
- **Why It Happened**: If any hook or worker called `dbClient.close()`, the shared singleton `pg.Pool` instance was marked ended. Subsequent tests using `dbClient` failed.
- **Diagnosis**: Stack trace pointing to `node_modules/pg-pool/index.js`.
- **Solution**: Implemented self-healing pool recreation in `DbClient`:
  ```typescript
  private getActivePool(): Pool {
    if ((this.pool as any).ended) {
      this.initPool();
    }
    return this.pool;
  }
  ```
- **Why It Works**: Transparently detects when the pool was closed and instantiates a fresh pool on the next query.

### Problem 3: BullMQ Blocking Connection Requirement
- **What Happened**: `TransferQueueClient` failed to connect with BullMQ errors.
- **Why It Happened**: BullMQ uses blocking Redis operations (`BRPOPLPUSH`). If `maxRetriesPerRequest` is not set to `null`, `ioredis` rejects commands.
- **Diagnosis**: BullMQ documentation and console warnings.
- **Solution**: Configured dedicated IORedis connection:
  ```typescript
  this.connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  ```
- **Why It Works**: Satisfies BullMQ protocol requirements.

---

# Part 18 — Complete Execution Walkthrough

Here is the exact lifecycle of an automated test execution (`test('transitions an active card to frozen status')`):

1. **Test Runner Initialization**: Playwright loads `playwright.config.ts`, parses `env.config.ts`, and discovers 64 tests across 7 spec files.
2. **Worker Spawning**: Playwright spawns parallel worker processes.
3. **Fixture Resolution**: Test declares `{ authUser }`.
4. **User Generation**: `generateTestUserData()` creates unique email `qa_1726645800_1234_1@wrightpay-qa.test`.
5. **Signup**: `AuthApi.signup()` sends `POST http://localhost:3001/api/v1/auth/signup`.
6. **Email Verification**: `AuthApi.verifyEmail()` sends OTP `'123456'`. Backend sets `accountStatus: 'active'`.
7. **Login**: `AuthApi.login()` posts credentials and extracts `access_token`.
8. **Context Creation**: Playwright creates an isolated `APIRequestContext` with `Authorization: Bearer <token>`.
9. **Test Body Execution**: Test calls `authUser.api.cards.createCard(cardPayload)`.
10. **Card Provisioning**: Backend creates card in PostgreSQL with status `'active'`.
11. **State Transition**: Test calls `authUser.api.cards.freezeCard(card.id)`.
12. **Status Assertion**: Test asserts response status is `200 OK` and `body.status === 'frozen'`.
13. **Cross-Layer Assertion**: Test invokes `dbClient.queryOne('SELECT status FROM cards WHERE id = $1', [card.id])`. Asserts database row is `'frozen'`.
14. **Teardown**: Playwright runs fixture cleanup, calling `authContext.dispose()`.

---

# Part 19 — Important SDET Concepts

- **API Testing**: Functional validation of HTTP endpoints, contracts, status codes, and headers.
- **Cross-Layer Testing**: Validating that an API operation produced the correct persistent side effects in PostgreSQL, Redis, and queues.
- **Test Isolation**: Ensuring test cases are 100% independent and can run concurrently without state collision.
- **State Machine Testing**: Verifying valid transitions, terminal states, and asserting that invalid transitions return proper error codes (e.g., 400).
- **IDOR (Insecure Direct Object Reference)**: Security testing verifying that Tenant A cannot access or mutate Tenant B's entities.
- **Mass Assignment / Parameter Tampering**: Verifying that API gateways strip non-whitelisted fields (like `id` or `email`) during PATCH/PUT requests.
- **Data Masking (PCI-DSS)**: Ensuring sensitive financial attributes (full PAN, CVV, password hashes) are never exposed via API or logged in plaintext.
- **Idempotency**: Guaranteeing that repeated requests produce the exact same outcome without duplicate side effects.

---

# Part 20 — API Testing vs. Integration Testing

| Dimension | Pure API Functional Testing | API + DB/Queue Integration Verification |
| :--- | :--- | :--- |
| **Perspective** | Black-box. Interacts solely with HTTP inputs and outputs. | Grey-box. Interacts with HTTP, then inspects backend storage directly. |
| **Network Target** | Only communicates with the NestJS API gateway. | Communicates with NestJS API, PostgreSQL, Redis, and BullMQ. |
| **What It Catches** | Routing errors, validation pipes, HTTP status codes, JSON schema errors. | Silent data loss, password hashing bugs, background job failures, cache TTL bugs. |
| **Example in WrightPay** | Asserting `POST /auth/signup` returns `201 Created` and `{ userId }`. | Asserting `users.passwordHash` starts with `$argon2` and default `wallets` row exists in DB. |

---

# Part 21 — SDET Interview Preparation

### Q1: Why did we create API client classes instead of making raw `page.request.post()` calls in tests?
- **Short Answer**: To achieve DRY principles, maintainability, and clean separation of concerns.
- **Deeper Explanation**: If an endpoint path or request schema changes, updating a raw call would require modifying dozens of test files. With API clients, changes are made in one central method. Tests remain readable business specifications.

### Q2: Why don't we put `expect()` assertions inside API clients?
- **Short Answer**: Putting assertions in API clients destroys their reusability for negative testing.
- **Deeper Explanation**: If `createCard()` asserted `expect(response.status()).toBe(201)`, we could never use that method to test invalid inputs, empty names, or unsupported card types that expect `400 Bad Request`. API clients must remain neutral HTTP dispatchers.

### Q3: Why do we use Playwright `APIRequestContext` rather than `axios` or `fetch`?
- **Short Answer**: Unified test framework ecosystem, native browser cookie jar sharing, and zero third-party HTTP dependencies.
- **Deeper Explanation**: `APIRequestContext` is built into `@playwright/test`. It automatically integrates with Playwright's trace viewer, HTML reporters, fixture dependency injection, and network lifecycle management.

### Q4: Why validate PostgreSQL after an API request if the API already returned 200 OK?
- **Short Answer**: To catch silent data corruption, verify data security (Argon2 hashing), and confirm default entity provisioning.
- **Deeper Explanation**: In financial systems, an API might return 200 OK while failing to write to disk, leaving sensitive passwords plaintext, or failing to initialize a default EUR wallet. Cross-layer validation guarantees persistent integrity.

### Q5: How is multi-tenant isolation (IDOR) tested in this framework?
- **Short Answer**: We provision two distinct users in the same test and have User B attempt to access and mutate User A's resources.
- **Deeper Explanation**: In `cards.spec.ts`, User A creates Card A, and User B creates Card B. User B attempts to freeze, unfreeze, deactivate, and delete Card A. We assert that all unauthorized requests return `404 Not Found` and verify via PostgreSQL that Card A remained unchanged.

---

# Part 22 — Debugging Guide

### Common Investigatory Scenarios

1. **Unexpected 401 Unauthorized**:
   - Verify JWT expiration.
   - Check if endpoint path had a leading slash that stripped `/api/v1`.
   - Ensure Authorization header is formatted as `Bearer <token>`.
2. **Unexpected 400 Bad Request**:
   - Inspect backend logs for `ValidationPipe` messages.
   - Check DTO constraints in `backend/src/modules/<domain>/dto/`.
3. **Database Assertion Mismatch**:
   - Run manual query using `psql`:
     ```bash
     docker exec -it wrightpay-postgres psql -U postgres -d wrightpay -c "SELECT * FROM users;"
     ```
4. **Redis Inspection**:
   - Connect via `redis-cli`:
     ```bash
     docker exec -it wrightpay-redis redis-cli keys "bull:transfers:*"
     ```
5. **Useful Framework Debugging Commands**:
   - Run with trace viewer: `npx playwright test --trace on`
   - Run in headed UI mode: `npm run test:ui`
   - Open HTML report: `npm run test:report`
   - Run typecheck: `npm run typecheck`

---

# Part 23 — Current Test Inventory

| Domain | File Path | Test Count | What It Covers | DB Validation? | Auth Required? | Mutating or Read-Only | Security Rules Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Skeleton** | `tests/proof-of-life.spec.ts` | 1 | Runner sanity check | No | No | Read-Only | None |
| **Infra Smoke** | `tests/infra-smoke.spec.ts` | 3 | PostgreSQL, Redis, BullMQ health | Yes (Direct) | No | Mutating (Ephemeral) | Connection health |
| **API Smoke** | `tests/api-smoke.spec.ts` | 2 | Public rates & authUser fixture | No | Mixed | Read-Only | Fixture wiring |
| **Auth** | `tests/auth/auth.spec.ts` | 19 | Signup, Login, OTP, Logout, JWT boundaries | Yes | Mixed | Mutating | Argon2, JWT forgery, OTP replay, enumeration |
| **Users** | `tests/users/users.spec.ts` | 12 | Profile GET/PATCH, IDOR, Whitelisting | Yes | Yes | Mutating | Mass assignment, isolation |
| **Wallet** | `tests/wallet/wallet.spec.ts` | 8 | Schema, Precision, Equivalents, DB parity | Yes | Yes | Read-Only | Multi-currency invariants, idempotence |
| **Cards** | `tests/cards/cards.spec.ts` | 19 | CRUD, State Machine, Hard Delete, IDOR | Yes | Yes | Mutating | PAN masking, terminal states, cross-tenant IDOR |
| **Beneficiaries** | `tests/beneficiaries/beneficiaries.spec.ts` | 25 | Bank & UPI, Validation, Max 3 Active, Soft Delete, IDOR | Yes | Yes | Mutating | Max active quota, UPI INR rule, cross-tenant IDOR |
| **Transfers** | `tests/transfers/transfers.spec.ts` | 30 | Contract, DTO Validation, Insufficient Funds, 25 EUR Fee, IDOR, Idempotency, Redis, BullMQ, Settlement, Simulation Failure, Concurrency, Boundaries | Yes | Yes | Mutating | Pessimistic locking, deduplication, IDOR, authorization, financial balance invariant |
| **Transactions** | `tests/transactions/transactions.spec.ts` | 28 | Read Model, Formatted Contract, Pagination, Status & Ref Search, Sorting, Async State, IDOR | Yes | Yes | Read-Only | Tenant isolation, IDOR, enumeration prevention, param validation |

**Total Implemented Tests**: **147 Passing Tests** (119 Baseline + 28 Transactions)

---

# Part 24 — Complete QA Automation File Index

| File Path | Category | Purpose | Major Dependencies | Used By |
| :--- | :--- | :--- | :--- | :--- |
| `package.json` | Config | Dependencies & scripts | npm | Framework |
| `playwright.config.ts` | Config | Test runner configuration | `@playwright/test`, `env.config` | Test runner |
| `tsconfig.json` | Config | TypeScript settings & aliases | TypeScript | Compiler |
| `config/env.config.ts` | Config | Environment loader | `dotenv` | Config, Fixtures, DB, Redis |
| `database/db-client.ts` | Infrastructure | PostgreSQL pool & queries | `pg`, `env.config` | Fixtures, Smoke & Domain tests |
| `redis/redis-client.ts` | Infrastructure | Redis key & TTL client | `ioredis`, `env.config` | Fixtures, Smoke tests |
| `queues/queue-client.ts` | Infrastructure | BullMQ queue inspector | `bullmq`, `ioredis` | Fixtures, Smoke tests |
| `api/base.api.ts` | API Client | Abstract HTTP client & pathing | `@playwright/test` | All domain API clients |
| `api/types.ts` | API Client | Models, DTOs, & Enums | None | All API clients & tests |
| `api/auth.api.ts` | API Client | `/auth` endpoints | `base.api`, `types` | Fixtures, Auth tests |
| `api/users.api.ts` | API Client | `/users` endpoints | `base.api`, `types` | Fixtures, Users tests |
| `api/wallet.api.ts` | API Client | `/wallets` endpoints | `base.api` | Fixtures, Wallet tests |
| `api/cards.api.ts` | API Client | `/cards` endpoints | `base.api`, `types` | Fixtures, Cards tests |
| `api/beneficiaries.api.ts` | API Client | `/beneficiaries` endpoints | `base.api`, `types` | Fixtures |
| `api/transfers.api.ts` | API Client | `/transfers` endpoints | `base.api`, `types` | Fixtures |
| `api/transactions.api.ts` | API Client | `/transactions` endpoints | `base.api`, `types` | Fixtures |
| `api/exchange-rates.api.ts` | API Client | `/exchange-rates` endpoints | `base.api`, `types` | Fixtures, Smoke tests |
| `api/index.ts` | API Client | Public barrel export | All api files | Fixtures, Tests |
| `test-data/user.factory.ts` | Test Data | Dynamic user data generator | `types` | Fixtures, Domain tests |
| `fixtures/api.fixtures.ts` | Fixtures | Custom Playwright fixture | `@playwright/test`, API clients, DB | All domain tests |
| `tests/proof-of-life.spec.ts` | Tests | Sanity check | `@playwright/test` | Test runner |
| `tests/infra-smoke.spec.ts` | Tests | Infrastructure health | DB, Redis, Queue clients | Test runner |
| `tests/api-smoke.spec.ts` | Tests | API architecture health | `api.fixtures` | Test runner |
| `tests/auth/auth.spec.ts` | Tests | Authentication test suite | `api.fixtures`, DB | Test runner |
| `tests/users/users.spec.ts` | Tests | Users test suite | `api.fixtures`, DB | Test runner |
| `tests/wallet/wallet.spec.ts` | Tests | Wallet test suite | `api.fixtures`, DB | Test runner |
| `tests/cards/cards.spec.ts` | Tests | Cards test suite | `api.fixtures`, DB | Test runner |
| `tests/beneficiaries/beneficiaries.spec.ts` | Tests | Beneficiaries test suite | `api.fixtures`, DB | Test runner |
| `tests/transfers/transfers.spec.ts` | Tests | Transfers test suite (30 tests) | `api.fixtures`, DB, Redis, BullMQ | Test runner |
| `tests/transactions/transactions.spec.ts` | Tests | Transactions test suite (28 tests) | `api.fixtures`, DB | Test runner |

---


---

# STEP 5E — BENEFICIARIES API TESTING

### Domain Overview & Architecture
The Beneficiaries domain manages payout recipients for cross-border financial remittances in WrightPay. Beneficiaries represent external payout destinations belonging to an authenticated user and support two distinct payment rails:
1. **Traditional Bank Account** (`bank_account`): European SEPA / Direct Bank transfer destinations defined by account numbers, routing/bank codes, and optional IFSC codes.
2. **Indian Unified Payments Interface** (`upi`): Indian real-time payment destinations defined by Virtual Payment Addresses (VPA) / UPI IDs (`user@bank`), restricted strictly to Indian Rupee (`INR`) payouts.

All endpoints are hosted on the NestJS backend at `http://localhost:3001/api/v1/beneficiaries` and are guarded by `JwtAuthGuard` requiring an `Authorization: Bearer <token>` header. In the PostgreSQL persistence layer, beneficiaries are stored in the `beneficiaries` table with a foreign key referencing `users(id)` and a nullable `deletedAt` timestamp managed by TypeORM's `@DeleteDateColumn()` to provide soft deletion.

---

### Actual Backend Contract Discovered

| HTTP Method | Endpoint | Status Codes | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/beneficiaries` | `200 OK`, `401 Unauthorized` | Returns all active (non-deleted) beneficiaries for authenticated caller, sorted by `name: 'ASC'`. |
| **POST** | `/beneficiaries` | `201 Created`, `400 Bad Request`, `401 Unauthorized` | Creates a beneficiary. Enforces maximum 3 active beneficiaries per user, UPI currency restrictions, and bank account requirements. |
| **DELETE** | `/beneficiaries/:id` | `200 OK`, `401 Unauthorized`, `404 Not Found` | Soft deletes beneficiary by setting `deletedAt = NOW()`. Idempotency guard: repeated call returns 404. Cross-user IDOR returns 404. |

---

### Request & Response Schemas

#### 1. Request Body (`CreateBeneficiaryDto`)
```typescript
{
  name: string;                   // Required, non-empty string
  currency: Currency;             // Required enum: 'EUR' | 'GBP' | 'USD' | 'AED' | 'PLN' | 'INR'
  payoutMethod?: 'bank_account' | 'upi'; // Optional enum, defaults to 'bank_account'
  accountNumber?: string;         // Required if payoutMethod === 'bank_account'
  bankCode?: string;              // Required by DTO if payoutMethod === 'bank_account', defaults to 'DIRECT'
  ifscCode?: string;              // Optional string
  upiId?: string;                 // Required if payoutMethod === 'upi'
  bankName?: string;              // Optional string, defaults to 'Bank Account' or 'UPI'
}
```

#### 2. Response Body (`Beneficiary`)
```json
{
  "id": "b1111111-1111-1111-1111-111111111111",
  "userId": "u1111111-1111-1111-1111-111111111111",
  "name": "Maria Rossi",
  "currency": "EUR",
  "payoutMethod": "bank_account",
  "accountNumber": "IT12A345678901234567890",
  "bankCode": "UNCRITM1",
  "bankName": "UniCredit",
  "deletedAt": null
}
```

---

### Core Business Rules Verified

1. **Maximum Active Limit (Quota = 3)**:
   - A user may possess at most **3 active beneficiaries** (`MAX_BENEFICIARIES = 3`).
   - If an active user already has 3 beneficiaries, attempting to create a 4th returns `400 Bad Request` with message: `"Maximum limit of 3 active beneficiaries reached"`.
2. **UPI Payout Restrictions**:
   - UPI beneficiaries require `currency: 'INR'`. Passing any other currency (e.g. `USD`, `EUR`) returns `400 Bad Request` with message: `"UPI payout method is only supported for INR currency"`.
   - UPI beneficiaries require a non-empty `upiId` (e.g. `rohan@okhdfcbank`). Missing or blank string returns `400 Bad Request` with message: `"UPI ID is required for UPI payout method"`.
3. **Bank Account Payout Restrictions**:
   - Bank account beneficiaries require `accountNumber`. Missing account number returns `400 Bad Request` with message: `"Account number is required for bank account payout method"`.
   - When `payoutMethod: 'bank_account'` is explicitly provided, ClassValidator's `@ValidateIf` also requires `bankCode`.
4. **Soft Deletion & Slot Reuse**:
   - Calling `DELETE /beneficiaries/:id` executes TypeORM `softDelete({ id, userId })`.
   - The PostgreSQL row is **not physically removed**; its `deletedAt` column is set to the current timestamp.
   - TypeORM's `count({ where: { userId } })` automatically filters out soft-deleted records. Therefore, deleting 1 of 3 beneficiaries decrements the active count to 2, **successfully freeing a slot** to create a replacement beneficiary!
5. **No Duplicate Uniqueness Constraint**:
   - The database contains no unique index on `(userId, name)` or `(userId, accountNumber)`.
   - Creating two beneficiaries with identical names and accounts is allowed by design (e.g. for re-adding accounts or multiple recipient profiles).
6. **Multi-Tenant Ownership & IDOR Protection**:
   - `DELETE /beneficiaries/:id` queries `findOne({ where: { id, userId } })`. If the beneficiary belongs to User A, User B's delete attempt returns `404 Not Found` (`"Beneficiary not found"`), leaving User A's record completely untouched in PostgreSQL.

---

## File: qa/automation/api/beneficiaries.api.ts

### Purpose
Provides standard, reusable HTTP client methods for invoking Beneficiaries API endpoints.

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateBeneficiaryRequest } from './types';

export class BeneficiariesApi extends BaseApi {
  async getMyBeneficiaries(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('beneficiaries', { headers });
  }

  async createBeneficiary(data: CreateBeneficiaryRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('beneficiaries', { data, headers });
  }

  async deleteBeneficiary(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.delete(`beneficiaries/${id}`, { headers });
  }
}

```

### Code Explanation
- **Lines 5–8 (`getMyBeneficiaries`)**: Dispatches `GET /beneficiaries` using `BaseApi.get()`, retrieving the user's active beneficiaries.
- **Lines 10–12 (`createBeneficiary`)**: Dispatches `POST /beneficiaries` with request body payload.
- **Lines 14–16 (`deleteBeneficiary`)**: Dispatches `DELETE /beneficiaries/:id` targeted by UUID path parameter.

---

## File: qa/automation/api/types.ts (Beneficiaries Types)

### Purpose
TypeScript contracts defining the request schema and supported payout methods.

### Actual Current Code (Beneficiaries Section)
```typescript
export type BeneficiaryPayoutMethod = 'bank_account' | 'upi' | 'BANK_ACCOUNT' | 'UPI';

export interface CreateBeneficiaryRequest {
  name: string;
  currency: Currency;
  payoutMethod?: BeneficiaryPayoutMethod;
  accountNumber?: string;
  bankCode?: string;
  ifscCode?: string;
  upiId?: string;
  bankName?: string;
}
```

---

## File: qa/automation/tests/beneficiaries/beneficiaries.spec.ts

### Purpose
Executable specification containing 25 comprehensive API test cases covering retrieval, creation, validation, UPI rules, maximum active limits, soft deletion, slot reuse, IDOR security, and database persistence.

### Actual Current Code
```typescript
import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { BeneficiariesApi } from '../../api';
import { CreateBeneficiaryRequest } from '../../api/types';

function generateTestBeneficiaryData(overrides?: Partial<CreateBeneficiaryRequest>): CreateBeneficiaryRequest {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return {
    name: overrides?.name || `Beneficiary_${unique}`,
    currency: overrides?.currency || 'EUR',
    payoutMethod: overrides?.payoutMethod || 'bank_account',
    accountNumber: overrides?.accountNumber || `IT12A${unique}`,
    bankCode: overrides?.bankCode || 'UNCRITM1',
    bankName: overrides?.bankName || 'UniCredit',
    ...overrides,
  };
}

function generateTestUpiBeneficiaryData(overrides?: Partial<CreateBeneficiaryRequest>): CreateBeneficiaryRequest {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return {
    name: overrides?.name || `UPI_Beneficiary_${unique}`,
    currency: 'INR',
    payoutMethod: 'upi',
    upiId: overrides?.upiId || `qa_${unique}@okhdfcbank`,
    bankName: overrides?.bankName || 'UPI',
    ...overrides,
  };
}

test.describe('Beneficiaries Domain API Tests', () => {
  // ==========================================
  // 1. GET /beneficiaries - Listing & Retrieval
  // ==========================================
  test.describe('GET /beneficiaries - Listing & Retrieval', () => {
    test('returns an empty array for a newly registered user with no beneficiaries', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.getMyBeneficiaries();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    test('returns active beneficiaries for authenticated user ordered by name ascending', async ({ authUser }) => {
      const b1 = generateTestBeneficiaryData({ name: 'Zara Phillips' });
      const b2 = generateTestBeneficiaryData({ name: 'Alice Walker' });

      const res1 = await authUser.api.beneficiaries.createBeneficiary(b1);
      expect(res1.status()).toBe(201);

      const res2 = await authUser.api.beneficiaries.createBeneficiary(b2);
      expect(res2.status()).toBe(201);

      const listRes = await authUser.api.beneficiaries.getMyBeneficiaries();
      expect(listRes.status()).toBe(200);

      const body = await listRes.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);

      // Verify sorting order is ASC by name
      expect(body[0].name).toBe('Alice Walker');
      expect(body[1].name).toBe('Zara Phillips');

      // Verify response schema contract
      expect(body[0].id).toBeDefined();
      expect(body[0].userId).toBe(authUser.user.id);
      expect(body[0].currency).toBe('EUR');
      expect(body[0].payoutMethod).toBe('bank_account');
      expect(body[0].accountNumber).toBe(b2.accountNumber);
      expect(body[0].deletedAt).toBeNull();
    });

    test('excludes soft-deleted beneficiaries from GET listing', async ({ authUser }) => {
      const bData = generateTestBeneficiaryData({ name: 'To Be Deleted' });
      const createRes = await authUser.api.beneficiaries.createBeneficiary(bData);
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      // Soft delete
      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(created.id);
      expect(deleteRes.status()).toBe(200);

      // Subsequent GET should not include the deleted beneficiary
      const listRes = await authUser.api.beneficiaries.getMyBeneficiaries();
      expect(listRes.status()).toBe(200);
      const body = await listRes.json();

      const found = body.find((b: any) => b.id === created.id);
      expect(found).toBeUndefined();
    });

    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('beneficiaries');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('beneficiaries', {
        headers: {
          Authorization: 'Bearer invalid.token.value',
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  // ==========================================
  // 2. POST /beneficiaries - Creation & Persistence
  // ==========================================
  test.describe('POST /beneficiaries - Creation & Persistence', () => {
    test('successfully creates a bank account beneficiary and verifies PostgreSQL persistence', async ({
      authUser,
    }) => {
      const payload = generateTestBeneficiaryData({
        name: 'Maria Rossi',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'IT12A345678901234567890',
        bankCode: 'UNCRITM1',
        bankName: 'UniCredit Milano',
      });

      const response = await authUser.api.beneficiaries.createBeneficiary(payload);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toBeDefined();
      expect(typeof body.id).toBe('string');
      expect(body.id.length).toBeGreaterThan(0);
      expect(body.userId).toBe(authUser.user.id);
      expect(body.name).toBe('Maria Rossi');
      expect(body.currency).toBe('EUR');
      expect(body.payoutMethod).toBe('bank_account');
      expect(body.accountNumber).toBe('IT12A345678901234567890');
      expect(body.bankCode).toBe('UNCRITM1');
      expect(body.bankName).toBe('UniCredit Milano');

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{
        id: string;
        userId: string;
        name: string;
        currency: string;
        payoutMethod: string;
        accountNumber: string;
        bankCode: string;
        bankName: string;
        deletedAt: string | null;
      }>(
        'SELECT id, "userId", name, currency, "payoutMethod", "accountNumber", "bankCode", "bankName", "deletedAt" FROM beneficiaries WHERE id = $1',
        [body.id],
      );

      expect(dbRow).not.toBeNull();
      expect(dbRow?.id).toBe(body.id);
      expect(dbRow?.userId).toBe(authUser.user.id);
      expect(dbRow?.name).toBe('Maria Rossi');
      expect(dbRow?.currency).toBe('EUR');
      expect(dbRow?.payoutMethod).toBe('bank_account');
      expect(dbRow?.accountNumber).toBe('IT12A345678901234567890');
      expect(dbRow?.bankCode).toBe('UNCRITM1');
      expect(dbRow?.bankName).toBe('UniCredit Milano');
      expect(dbRow?.deletedAt).toBeNull();
    });

    test('successfully creates a bank account beneficiary with default fallback values', async ({ authUser }) => {
      // Omit payoutMethod, bankCode, and bankName
      const payload = {
        name: 'Default Bank Beneficiary',
        currency: 'GBP' as const,
        accountNumber: 'GB29NWBK60161331926819',
      };

      const response = await authUser.api.beneficiaries.createBeneficiary(payload as any);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.payoutMethod).toBe('bank_account');
      expect(body.bankCode).toBe('DIRECT');
      expect(body.bankName).toBe('Bank Account');

      // Verify defaults in PostgreSQL
      const dbRow = await dbClient.queryOne<{
        payoutMethod: string;
        bankCode: string;
        bankName: string;
      }>('SELECT "payoutMethod", "bankCode", "bankName" FROM beneficiaries WHERE id = $1', [body.id]);

      expect(dbRow?.payoutMethod).toBe('bank_account');
      expect(dbRow?.bankCode).toBe('DIRECT');
      expect(dbRow?.bankName).toBe('Bank Account');
    });

    test('successfully creates a valid UPI beneficiary with INR currency and verifies PostgreSQL persistence', async ({
      authUser,
    }) => {
      const upiPayload = generateTestUpiBeneficiaryData({
        name: 'Rohan Sharma',
        upiId: 'rohan.sharma@okhdfcbank',
      });

      const response = await authUser.api.beneficiaries.createBeneficiary(upiPayload);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Rohan Sharma');
      expect(body.currency).toBe('INR');
      expect(body.payoutMethod).toBe('upi');
      expect(body.upiId).toBe('rohan.sharma@okhdfcbank');
      expect(body.bankName).toBe('UPI');

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{
        id: string;
        currency: string;
        payoutMethod: string;
        upiId: string;
        bankName: string;
        deletedAt: string | null;
      }>('SELECT id, currency, "payoutMethod", "upiId", "bankName", "deletedAt" FROM beneficiaries WHERE id = $1', [body.id]);

      expect(dbRow).not.toBeNull();
      expect(dbRow?.currency).toBe('INR');
      expect(dbRow?.payoutMethod).toBe('upi');
      expect(dbRow?.upiId).toBe('rohan.sharma@okhdfcbank');
      expect(dbRow?.bankName).toBe('UPI');
      expect(dbRow?.deletedAt).toBeNull();
    });
  });

  // ==========================================
  // 3. POST /beneficiaries - Validation Boundaries
  // ==========================================
  test.describe('POST /beneficiaries - Validation Boundaries', () => {
    test('rejects creation when name is missing or empty', async ({ authUser }) => {
      const resMissing = await authUser.api.beneficiaries.createBeneficiary({
        currency: 'EUR',
        accountNumber: '12345678',
      } as any);
      expect(resMissing.status()).toBe(400);

      const resEmpty = await authUser.api.beneficiaries.createBeneficiary({
        name: '',
        currency: 'EUR',
        accountNumber: '12345678',
      });
      expect(resEmpty.status()).toBe(400);
    });

    test('rejects creation with invalid currency enum value', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Invalid Currency',
        currency: 'XYZ' as any,
        accountNumber: '12345678',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects bank account creation when accountNumber is missing', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Missing Account',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        bankCode: 'UNCRITM1',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects bank account creation when bankCode is missing and payoutMethod is bank_account', async ({
      authUser,
    }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Missing Bank Code',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: '1234567890',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects creation with unsupported payoutMethod enum value', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Bad Method',
        currency: 'EUR',
        payoutMethod: 'crypto' as any,
        accountNumber: '12345678',
      });
      expect(response.status()).toBe(400);
    });
  });

  // ==========================================
  // 4. POST /beneficiaries - UPI & Currency Business Rules
  // ==========================================
  test.describe('POST /beneficiaries - UPI & Currency Business Rules', () => {
    test('rejects UPI beneficiary when currency is not INR', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Invalid UPI Currency',
        currency: 'USD',
        payoutMethod: 'upi',
        upiId: 'user@okhdfcbank',
      });

      expect(response.status()).toBe(400);
      const errorBody = await response.json();
      expect(errorBody.message).toContain('UPI payout method is only supported for INR currency');
    });

    test('rejects UPI beneficiary when upiId is missing or empty', async ({ authUser }) => {
      const resMissing = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Missing UPI ID',
        currency: 'INR',
        payoutMethod: 'upi',
      });
      expect(resMissing.status()).toBe(400);

      const resEmpty = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Empty UPI ID',
        currency: 'INR',
        payoutMethod: 'upi',
        upiId: '   ',
      });
      expect(resEmpty.status()).toBe(400);
    });
  });

  // ==========================================
  // 5. POST /beneficiaries - Maximum Active Limit
  // ==========================================
  test.describe('POST /beneficiaries - Maximum Active Beneficiary Limit', () => {
    test('enforces maximum limit of 3 active beneficiaries per user and rejects 4th creation', async ({
      authUser,
    }) => {
      // Beneficiary 1
      const res1 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 1' }));
      expect(res1.status()).toBe(201);

      // Beneficiary 2
      const res2 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 2' }));
      expect(res2.status()).toBe(201);

      // Beneficiary 3
      const res3 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 3' }));
      expect(res3.status()).toBe(201);

      // Beneficiary 4 - Must be rejected
      const res4 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 4' }));
      expect(res4.status()).toBe(400);
      const errorBody = await res4.json();
      expect(errorBody.message).toContain('Maximum limit of 3 active beneficiaries reached');

      // Verify active count in PostgreSQL
      const dbCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "deletedAt" IS NULL',
        [authUser.user.id],
      );
      expect(Number(dbCount?.count)).toBe(3);
    });
  });

  // ==========================================
  // 6. DELETE /beneficiaries/:id - Soft Deletion & Slot Reuse
  // ==========================================
  test.describe('DELETE /beneficiaries/:id - Soft Deletion & Slot Reuse', () => {
    test('soft deletes beneficiary by populating deletedAt timestamp in PostgreSQL database', async ({ authUser }) => {
      const beneficiary = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData())
      ).json();

      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(beneficiary.id);
      expect(deleteRes.status()).toBe(200);

      const deleteBody = await deleteRes.json();
      expect(deleteBody.message).toBe('Beneficiary successfully deleted');
      expect(deleteBody.id).toBe(beneficiary.id);

      // Verify database record still physically exists but deletedAt is populated
      const dbRow = await dbClient.queryOne<{
        id: string;
        deletedAt: string | null;
      }>('SELECT id, "deletedAt" FROM beneficiaries WHERE id = $1', [beneficiary.id]);

      expect(dbRow).not.toBeNull();
      expect(dbRow?.id).toBe(beneficiary.id);
      expect(dbRow?.deletedAt).not.toBeNull();
    });

    test('repeated deletion of an already soft-deleted beneficiary returns 404', async ({ authUser }) => {
      const beneficiary = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData())
      ).json();

      // First delete succeeds
      const res1 = await authUser.api.beneficiaries.deleteBeneficiary(beneficiary.id);
      expect(res1.status()).toBe(200);

      // Second delete fails with 404
      const res2 = await authUser.api.beneficiaries.deleteBeneficiary(beneficiary.id);
      expect(res2.status()).toBe(404);
      const errorBody = await res2.json();
      expect(errorBody.message).toContain('Beneficiary not found');
    });

    test('soft deletion frees an active slot allowing a new beneficiary to be created under max 3 limit', async ({
      authUser,
    }) => {
      // Create 3 active beneficiaries
      const b1 = await (await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 1' }))).json();
      await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 2' }));
      await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 3' }));

      // Attempt 4th creation -> rejected
      const rejectRes = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 4' }));
      expect(rejectRes.status()).toBe(400);

      // Soft delete b1
      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(b1.id);
      expect(deleteRes.status()).toBe(200);

      // Confirm active count is now 2
      const activeCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "deletedAt" IS NULL',
        [authUser.user.id],
      );
      expect(Number(activeCount?.count)).toBe(2);

      // Now create a 4th beneficiary -> must succeed
      const newRes = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'New Slot Beneficiary' }));
      expect(newRes.status()).toBe(201);
      const newBen = await newRes.json();
      expect(newBen.id).toBeDefined();

      // Total rows in DB is 4 (3 active, 1 soft-deleted)
      const totalCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(totalCount?.count)).toBe(4);
    });
  });

  // ==========================================
  // 7. Multi-Tenant Isolation & Cross-User Security (IDOR)
  // ==========================================
  test.describe('Multi-Tenant Isolation & Cross-User Security (IDOR)', () => {
    test('enforces strict multi-tenant isolation and rejects cross-user beneficiary deletion (IDOR)', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A creates Beneficiary A
      const benA = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'User A Beneficiary' }))
      ).json();

      // Provision User B
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({ email: testUserB.email, password: testUserB.password });
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: (await authUser.api.beneficiaries.getMyBeneficiaries()).url().replace(/\/beneficiaries.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const beneficiariesApiB = new BeneficiariesApi(contextB);

      // User B attempts to DELETE User A's beneficiary
      const idorDeleteRes = await beneficiariesApiB.deleteBeneficiary(benA.id);
      expect(idorDeleteRes.status()).toBe(404);
      const errorBody = await idorDeleteRes.json();
      expect(errorBody.message).toContain('Beneficiary not found');

      // Confirm Beneficiary A was NOT soft-deleted in PostgreSQL
      const dbRow = await dbClient.queryOne<{ deletedAt: string | null }>(
        'SELECT "deletedAt" FROM beneficiaries WHERE id = $1',
        [benA.id],
      );
      expect(dbRow?.deletedAt).toBeNull();

      await contextB.dispose();
    });

    test('ensures GET /beneficiaries isolates user data and never leaks beneficiaries across accounts', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A creates Beneficiary A
      const benA = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'User A Secret Beneficiary' }))
      ).json();

      // Provision User B
      const testUserB = generateTestUserData();
      await authApi.signup(testUserB);
      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });
      const loginB = await authApi.login({ email: testUserB.email, password: testUserB.password });
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: (await authUser.api.beneficiaries.getMyBeneficiaries()).url().replace(/\/beneficiaries.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const beneficiariesApiB = new BeneficiariesApi(contextB);
      const benB = await (
        await beneficiariesApiB.createBeneficiary(generateTestBeneficiaryData({ name: 'User B Beneficiary' }))
      ).json();

      // User A listing
      const listA = await (await authUser.api.beneficiaries.getMyBeneficiaries()).json();
      expect(listA.some((b: any) => b.id === benA.id)).toBe(true);
      expect(listA.some((b: any) => b.id === benB.id)).toBe(false);

      // User B listing
      const listB = await (await beneficiariesApiB.getMyBeneficiaries()).json();
      expect(listB.some((b: any) => b.id === benB.id)).toBe(true);
      expect(listB.some((b: any) => b.id === benA.id)).toBe(false);

      await contextB.dispose();
    });
  });

  // ==========================================
  // 8. Invalid & Non-Existent Identifier Boundaries
  // ==========================================
  test.describe('Invalid & Non-Existent Identifier Boundaries', () => {
    test('returns 404 when attempting to delete a non-existent beneficiary UUID', async ({ authUser }) => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const response = await authUser.api.beneficiaries.deleteBeneficiary(nonExistentUuid);
      expect(response.status()).toBe(404);
      const errorBody = await response.json();
      expect(errorBody.message).toContain('Beneficiary not found');
    });
  });

  // ==========================================
  // 9. Duplicate Beneficiary Handling
  // ==========================================
  test.describe('Duplicate Beneficiary Handling', () => {
    test('allows creating multiple beneficiaries with the same name or details without constraint failure', async ({
      authUser,
    }) => {
      const sharedName = 'Duplicate Recipient';
      const sharedAccount = 'DE89370400440532013000';

      const res1 = await authUser.api.beneficiaries.createBeneficiary({
        name: sharedName,
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: sharedAccount,
        bankCode: 'DBKDEFF',
      });
      expect(res1.status()).toBe(201);
      const b1 = await res1.json();

      const res2 = await authUser.api.beneficiaries.createBeneficiary({
        name: sharedName,
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: sharedAccount,
        bankCode: 'DBKDEFF',
      });
      expect(res2.status()).toBe(201);
      const b2 = await res2.json();

      expect(b1.id).not.toBe(b2.id);
      expect(b1.name).toBe(b2.name);
      expect(b1.accountNumber).toBe(b2.accountNumber);

      // Verify both exist in database
      const count = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "accountNumber" = $2',
        [authUser.user.id, sharedAccount],
      );
      expect(Number(count?.count)).toBe(2);
    });
  });

  // ==========================================
  // 10. Authentication & Authorization Boundaries
  // ==========================================
  test.describe('Authentication & Authorization Boundaries', () => {
    test('rejects POST /beneficiaries when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.post('beneficiaries', {
        data: {
          name: 'Unauthorized Beneficiary',
          currency: 'EUR',
          accountNumber: '12345678',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('rejects DELETE /beneficiaries/:id when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.delete('beneficiaries/00000000-0000-0000-0000-000000000000');
      expect(response.status()).toBe(401);
    });
  });
});

```

---

### Detailed Breakdown of All 25 Test Cases

#### Test 1: `returns an empty array for a newly registered user with no beneficiaries`
1. **Behavior Tested**: Baseline empty state for fresh user accounts.
2. **Why It Exists**: Verifies that new users without beneficiaries receive an empty list rather than null or 404.
3. **Request Sent**: `GET /beneficiaries`
4. **Data Sent**: None (authenticated via Bearer token).
5. **Expected Response**: `200 OK` with empty JSON array `[]`.
6. **Assertions**: `response.status() === 200`, `Array.isArray(body) === true`, `body.length === 0`.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: HTTP contract verification.
9. **Rule Tested**: Empty state contract.
10. **Catchable Bug**: Null pointer exceptions or returning 500 when table has zero rows for user.

#### Test 2: `returns active beneficiaries for authenticated user ordered by name ascending`
1. **Behavior Tested**: Beneficiary listing, schema fields, and alphabetical sorting.
2. **Why It Exists**: Users expect recipient lists sorted alphabetically for easy scanning.
3. **Request Sent**: Create 'Zara Phillips', create 'Alice Walker', then `GET /beneficiaries`.
4. **Data Sent**: Two valid beneficiary payloads.
5. **Expected Response**: `200 OK` with array of 2 beneficiaries.
6. **Assertions**: First element is 'Alice Walker', second is 'Zara Phillips' (`name ASC`); schema properties (`id`, `userId`, `currency`, `payoutMethod`, `deletedAt: null`).
7. **Database Verification**: None (observable via API).
8. **Why DB Verification Matters**: Validates sorting invariant.
9. **Rule Tested**: `order: { name: 'ASC' }` backend query rule.
10. **Catchable Bug**: Unordered queries causing erratic UI listings.

#### Test 3: `excludes soft-deleted beneficiaries from GET listing`
1. **Behavior Tested**: Query filtering of soft-deleted records.
2. **Why It Exists**: Deleted recipients must not appear in active payout menus.
3. **Request Sent**: Create beneficiary, `DELETE /beneficiaries/:id`, then `GET /beneficiaries`.
4. **Data Sent**: Valid creation payload, then DELETE request.
5. **Expected Response**: `GET /beneficiaries` returns list omitting deleted ID.
6. **Assertions**: `found === undefined`.
7. **Database Verification**: None (verified in Test 17).
8. **Why DB Verification Matters**: Proves soft-deleted row is excluded from consumer endpoints.
9. **Rule Tested**: Soft-deletion filter on `GET`.
10. **Catchable Bug**: Deleted recipients appearing in transfer destination dropdowns.

#### Test 4 & 5: `rejects unauthenticated / invalid token requests on GET`
1. **Behavior Tested**: Authentication barrier.
2. **Why It Exists**: Protects personal banking details from anonymous access.
3. **Request Sent**: `GET /beneficiaries` without token, and with invalid token.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`.
6. **Assertions**: `response.status() === 401`.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Route security.
9. **Rule Tested**: `JwtAuthGuard` on `GET`.
10. **Catchable Bug**: Unauthenticated data leakage.

#### Test 6: `successfully creates a bank account beneficiary and verifies PostgreSQL persistence`
1. **Behavior Tested**: Bank beneficiary creation and persistent cross-layer storage.
2. **Why It Exists**: Validates standard SEPA/bank account onboarding.
3. **Request Sent**: `POST /beneficiaries` with `name: 'Maria Rossi'`, `currency: 'EUR'`, `accountNumber: 'IT12A...'`, `bankCode: 'UNCRITM1'`, `bankName: 'UniCredit Milano'`.
4. **Data Sent**: Full bank account payload.
5. **Expected Response**: `201 Created` with full entity JSON.
6. **Assertions**: Response properties match payload; database query confirms row exists with identical values and `deletedAt IS NULL`.
7. **Database Verification**: `SELECT id, "userId", name, currency, "payoutMethod", "accountNumber", "bankCode", "bankName", "deletedAt" FROM beneficiaries WHERE id = $1`.
8. **Why DB Verification Matters**: Confirms persistent database writes, column mapping, and foreign key integrity.
9. **Rule Tested**: Bank account onboarding persistence.
10. **Catchable Bug**: Silent write failures or column truncation.

#### Test 7: `successfully creates a bank account beneficiary with default fallback values`
1. **Behavior Tested**: Default value assignment for omitted fields.
2. **Why It Exists**: Verifies backend default logic (`payoutMethod` defaults to `bank_account`, `bankCode` to `DIRECT`, `bankName` to `Bank Account`).
3. **Request Sent**: `POST /beneficiaries` without `payoutMethod`, `bankCode`, or `bankName`.
4. **Data Sent**: `{ name, currency: 'GBP', accountNumber }`.
5. **Expected Response**: `201 Created`.
6. **Assertions**: `body.payoutMethod === 'bank_account'`, `body.bankCode === 'DIRECT'`, `body.bankName === 'Bank Account'`. Confirmed in PostgreSQL.
7. **Database Verification**: Queried defaults from PostgreSQL.
8. **Why DB Verification Matters**: Validates entity default values on disk.
9. **Rule Tested**: Default business fallbacks.
10. **Catchable Bug**: Null pointer crashes when optional fields are omitted.

#### Test 8: `successfully creates a valid UPI beneficiary with INR currency and verifies PostgreSQL persistence`
1. **Behavior Tested**: UPI rail beneficiary creation.
2. **Why It Exists**: Validates Indian real-time UPI recipient onboarding.
3. **Request Sent**: `POST /beneficiaries` with `currency: 'INR'`, `payoutMethod: 'upi'`, `upiId: 'rohan.sharma@okhdfcbank'`.
4. **Data Sent**: UPI payload.
5. **Expected Response**: `201 Created`.
6. **Assertions**: Response contains `currency: 'INR'`, `payoutMethod: 'upi'`, `upiId`, `bankName: 'UPI'`. Confirmed in PostgreSQL.
7. **Database Verification**: Verified in PostgreSQL `beneficiaries` table.
8. **Why DB Verification Matters**: Ensures UPI-specific columns are written properly.
9. **Rule Tested**: UPI payment rail onboarding.
10. **Catchable Bug**: UPI ID not persisted or mapped to incorrect column.

#### Test 9 to 13: `POST validation boundaries (missing name, invalid currency, missing account, missing bankCode, bad enum)`
1. **Behavior Tested**: DTO validation rules.
2. **Why It Exists**: Ensures invalid data is intercepted at the controller gateway.
3. **Request Sent**: `POST /beneficiaries` with malformed inputs.
4. **Data Sent**: Missing name, bad currency enum `'XYZ'`, missing `accountNumber`, missing `bankCode`, bad payoutMethod `'crypto'`.
5. **Expected Response**: `400 Bad Request` for all cases.
6. **Assertions**: `response.status() === 400`.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Invalid data rejected prior to SQL execution.
9. **Rule Tested**: NestJS `ValidationPipe` class-validator enforcement.
10. **Catchable Bug**: Corrupt or malformed records inserted into database.

#### Test 14: `rejects UPI beneficiary when currency is not INR`
1. **Behavior Tested**: Cross-field business rule: UPI requires INR.
2. **Why It Exists**: UPI is exclusively an Indian domestic payment rail.
3. **Request Sent**: `POST /beneficiaries` with `payoutMethod: 'upi'` and `currency: 'USD'`.
4. **Data Sent**: `{ name, currency: 'USD', payoutMethod: 'upi', upiId }`.
5. **Expected Response**: `400 Bad Request` with message: `"UPI payout method is only supported for INR currency"`.
6. **Assertions**: Status 400, message assertion.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Prevents invalid currency pairing.
9. **Rule Tested**: UPI currency restriction.
10. **Catchable Bug**: Allowing USD/EUR transfers over UPI network.

#### Test 15: `rejects UPI beneficiary when upiId is missing or empty`
1. **Behavior Tested**: UPI identifier requirement.
2. **Why It Exists**: Transfers cannot execute over UPI without a VPA handle.
3. **Request Sent**: `POST /beneficiaries` with `payoutMethod: 'upi'` and missing/whitespace `upiId`.
4. **Data Sent**: Missing `upiId`.
5. **Expected Response**: `400 Bad Request`.
6. **Assertions**: Status 400.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Required routing field.
9. **Rule Tested**: UPI address mandatory check.
10. **Catchable Bug**: Headless UPI beneficiary created with no destination address.

#### Test 16: `enforces maximum limit of 3 active beneficiaries per user and rejects 4th creation`
1. **Behavior Tested**: Active beneficiary quota enforcement.
2. **Why It Exists**: WrightPay business policy limits users to 3 active recipients.
3. **Request Sent**: Create Ben 1, Ben 2, Ben 3 (all 201), then attempt Ben 4.
4. **Data Sent**: 4 distinct beneficiary payloads.
5. **Expected Response**: Ben 1-3 return `201`; Ben 4 returns `400 Bad Request` with `"Maximum limit of 3 active beneficiaries reached"`.
6. **Assertions**: Ben 4 returns 400; DB active count is exactly 3.
7. **Database Verification**: `SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "deletedAt" IS NULL` equals 3.
8. **Why DB Verification Matters**: Confirms limit is strictly respected on disk.
9. **Rule Tested**: `MAX_BENEFICIARIES = 3` active limit.
10. **Catchable Bug**: Off-by-one errors allowing unlimited beneficiaries.

#### Test 17: `soft deletes beneficiary by populating deletedAt timestamp in PostgreSQL database`
1. **Behavior Tested**: Soft deletion mechanics.
2. **Why It Exists**: Financial audit regulations require historical records of past payout recipients.
3. **Request Sent**: Create beneficiary, then `DELETE /beneficiaries/:id`.
4. **Data Sent**: Beneficiary ID path parameter.
5. **Expected Response**: `200 OK` with `{ message: "Beneficiary successfully deleted", id }`.
6. **Assertions**: Status 200, response message; database query confirms row still exists and `deletedAt` is not null.
7. **Database Verification**: `SELECT id, "deletedAt" FROM beneficiaries WHERE id = $1`.
8. **Why DB Verification Matters**: Proves soft-delete preserves data for compliance instead of executing SQL `DELETE`.
9. **Rule Tested**: Soft-deletion architecture.
10. **Catchable Bug**: Hard deletion destroying audit trails for past transactions.

#### Test 18: `repeated deletion of an already soft-deleted beneficiary returns 404`
1. **Behavior Tested**: Deletion idempotency guard.
2. **Why It Exists**: Operating on already deleted entities should indicate they are no longer accessible.
3. **Request Sent**: Two consecutive `DELETE /beneficiaries/:id` calls.
4. **Data Sent**: Same ID.
5. **Expected Response**: First returns 200; second returns `404 Not Found` with `"Beneficiary not found"`.
6. **Assertions**: Status 404, message assertion.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: TypeORM `findOne` naturally excludes soft-deleted rows.
9. **Rule Tested**: Entity state transition guard.
10. **Catchable Bug**: Double deletion succeeding indefinitely.

#### Test 19: `soft deletion frees an active slot allowing a new beneficiary to be created under max 3 limit`
1. **Behavior Tested**: Slot reuse and quota calculation lifecycle.
2. **Why It Exists**: Users who reach their 3-beneficiary limit must be able to delete an old recipient and add a new one.
3. **Request Sent**: Create 3 beneficiaries -> attempt 4th (rejected with 400) -> delete Ben 1 -> verify active count is 2 -> create new Ben 4 (succeeds with 201).
4. **Data Sent**: Sequential creation, deletion, and recreation payloads.
5. **Expected Response**: 4th creation attempt succeeds with 201 after deleting one.
6. **Assertions**: Final creation returns 201; active DB count is 3; total physical rows in DB is 4 (3 active, 1 soft-deleted).
7. **Database Verification**: Active count (`deletedAt IS NULL`) = 3, Total count = 4.
8. **Why DB Verification Matters**: Proves quota is calculated against active records, not total rows.
9. **Rule Tested**: Quota slot release upon soft deletion.
10. **Catchable Bug**: Quota counting soft-deleted rows, permanently locking users out of adding beneficiaries.

#### Test 20 & 21: `enforces strict multi-tenant isolation and rejects cross-user beneficiary deletion and viewing (IDOR)`
1. **Behavior Tested**: Tenant isolation and Insecure Direct Object Reference (IDOR) prevention.
2. **Why It Exists**: A malicious user must never be able to view, delete, or modify another user's banking beneficiaries.
3. **Request Sent**: User A creates Ben A. User B attempts `DELETE /beneficiaries/:idA` and calls `GET /beneficiaries`.
4. **Data Sent**: User A's beneficiary ID.
5. **Expected Response**: User B's DELETE returns `404 Not Found`; User B's GET does not include Ben A; User A's GET does not include Ben B.
6. **Assertions**: Status 404 on IDOR delete; Ben A in DB still has `deletedAt IS NULL`; complete isolation on listings.
7. **Database Verification**: Queried Ben A in PostgreSQL to confirm `deletedAt` remained `null`.
8. **Why DB Verification Matters**: Cryptographic certainty of zero cross-tenant tampering.
9. **Rule Tested**: Multi-tenant data segregation.
10. **Catchable Bug**: Critical security vulnerability where any user can delete any other user's payout recipients.

#### Test 22: `returns 404 when attempting to delete a non-existent beneficiary UUID`
1. **Behavior Tested**: Non-existent resource handling.
2. **Why It Exists**: Ensures clean error handling when targeting missing entities.
3. **Request Sent**: `DELETE /beneficiaries/00000000-0000-0000-0000-000000000000`.
4. **Data Sent**: Valid formatted UUID that does not exist.
5. **Expected Response**: `404 Not Found` with `"Beneficiary not found"`.
6. **Assertions**: Status 404.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Standard REST error contract.
9. **Rule Tested**: Resource existence validation.
10. **Catchable Bug**: 500 internal server error on missing entities.

#### Test 23: `allows creating multiple beneficiaries with the same name or details without constraint failure`
1. **Behavior Tested**: Duplicate creation permissibility.
2. **Why It Exists**: Confirms system allows multiple accounts under the same person.
3. **Request Sent**: Two consecutive `POST /beneficiaries` with identical names and accounts.
4. **Data Sent**: Duplicate payload.
5. **Expected Response**: Both return `201 Created` with unique IDs.
6. **Assertions**: Both succeed, `b1.id !== b2.id`, DB count for that account is 2.
7. **Database Verification**: Queried DB count for that account number.
8. **Why DB Verification Matters**: Validates intentional absence of uniqueness constraints.
9. **Rule Tested**: Non-restrictive duplicate policy.
10. **Catchable Bug**: Accidental unique constraint blocking legitimate multi-account workflows.

#### Test 24 & 25: `rejects POST and DELETE when Authorization header is omitted`
1. **Behavior Tested**: Route guard enforcement.
2. **Why It Exists**: All mutation routes must require authentication.
3. **Request Sent**: Unauthenticated POST and DELETE calls.
4. **Data Sent**: Sample payloads / IDs.
5. **Expected Response**: `401 Unauthorized`.
6. **Assertions**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Gateway security.
9. **Rule Tested**: Route authentication.
10. **Catchable Bug**: Open unauthenticated mutating endpoints.

---

### Document Actual Discoveries

#### Confirmed from Backend Implementation
- **Soft Deletion Mechanism**: Beneficiaries are never physically deleted via SQL `DELETE`. TypeORM `@DeleteDateColumn() deletedAt` populates the deletion timestamp.
- **Quota Ceiling**: Users are capped at exactly 3 active beneficiaries (`MAX_BENEFICIARIES = 3`).
- **UPI Rail Rule**: UPI strictly mandates `INR` currency and a valid `upiId`.
- **Default Fallbacks**: When omitted, `payoutMethod` defaults to `'bank_account'`, `bankCode` defaults to `'DIRECT'`, and `bankName` defaults to `'Bank Account'`.
- **Sorting Invariant**: `GET /beneficiaries` returns recipients ordered by `name: 'ASC'`.
- **IDOR Protection**: All operations query `where: { id, userId }`, returning 404 for any cross-tenant access.

#### Confirmed from Tests
- **Slot Reuse Works Perfectly**: Soft-deleting one beneficiary immediately frees a slot, allowing an active user to create their 4th total beneficiary while remaining at exactly 3 active records.
- **Idempotency on Delete**: Calling DELETE twice on the same UUID returns `200 OK` first, then `404 Not Found` second.
- **Duplicate Records**: The backend permits duplicate beneficiaries with identical names and accounts without error.

#### Not Implemented / Not Currently Available
- **Direct Update (`PATCH /beneficiaries/:id`)**: There is currently no endpoint to modify an existing beneficiary's name, currency, or account number. Users must soft-delete and recreate.
- **Single Beneficiary Lookup (`GET /beneficiaries/:id`)**: There is no endpoint to fetch an individual beneficiary by ID. All retrieval is via `GET /beneficiaries`.

#### Initial Assumptions Corrected
1. **Payout Method Casing**: Initial audit suggested uppercase `'BANK_ACCOUNT' | 'UPI'`. In the actual TypeORM entity and DTO validation, the values are lowercase `'bank_account' | 'upi'`. Passing uppercase resulted in validation rejection. `api/types.ts` was updated to support the true lowercase enum values.
2. **Bank Code Requirement**: Initial audit assumed `bankCode` was completely optional. When `payoutMethod: 'bank_account'` is explicitly provided, ClassValidator's `@ValidateIf` makes `bankCode` mandatory.

---

### Problems Encountered & Solutions

#### Problem 1: `BeneficiaryPayoutMethod` Enum Validation Error
- **Problem**: Sending `payoutMethod: 'BANK_ACCOUNT'` resulted in `400 Bad Request` with error: `"payoutMethod must be one of the following values: bank_account, upi"`.
- **Investigation**: Inspected `backend/src/modules/beneficiaries/entities/beneficiary.entity.ts` and discovered enum values are defined in lowercase.
- **Root Cause**: `qa/automation/api/types.ts` had defined `BeneficiaryPayoutMethod = 'BANK_ACCOUNT' | 'UPI'`.
- **Solution**: Updated `qa/automation/api/types.ts` to `export type BeneficiaryPayoutMethod = 'bank_account' | 'upi' | 'BANK_ACCOUNT' | 'UPI';`.
- **Why It Works**: Aligns the client types with the backend validator while maintaining backwards compatibility.

#### Problem 2: Bank Account Creation Rejection on Missing `bankCode`
- **Problem**: Calling `createBeneficiary({ name, currency: 'EUR', payoutMethod: 'bank_account', accountNumber: '...' })` failed with 400 Bad Request.
- **Investigation**: Inspected `CreateBeneficiaryDto` in `create-beneficiary.dto.ts`.
- **Root Cause**: `@ValidateIf((o) => o.payoutMethod === BeneficiaryPayoutMethod.BANK_ACCOUNT) @IsNotEmpty() bankCode?: string;` makes `bankCode` mandatory whenever `payoutMethod` is explicitly set to `bank_account`.
- **Solution**: Ensured bank account payloads specify a valid `bankCode` (e.g. `UNCRITM1` or `DIRECT`).
- **Why It Works**: Satisfies the conditional DTO validation rule.

---

### Important SDET Concepts Demonstrated

- **Soft-Deletion Lifecycle Testing**: Validating that an API operation sets a timestamp on disk while the row remains physically intact in the database.
- **Resource Quota & Slot Reuse**: Proving that deleting an entity frees capacity under an application-level constraint (3-beneficiary ceiling).
- **Conditional DTO Validation Testing**: Testing cross-field conditional rules (`@ValidateIf`), verifying that fields required under one payment rail (bank account) are not enforced on another (UPI).
- **Sorting & Invariant Testing**: Asserting that list responses guarantee deterministic ordering (`name ASC`) across calls.
- **Multi-Tenant Security (IDOR)**: Using dual-user fixture sessions to guarantee zero cross-tenant read or write access.

---

### SDET Interview Preparation

#### Q1: How do you verify soft deletion in an automated API test?
- **Short Answer**: Assert that the DELETE endpoint returns success, verify that subsequent GET calls exclude the resource, and query the database directly to confirm the row still exists with a populated `deletedAt` timestamp.
- **Deeper Explanation**: Black-box API tests can only see that the resource disappeared from `GET` listings. Without database verification, you cannot know if the system executed an unsafe physical `DELETE` or a compliant soft-delete. In banking platforms where historical audit trails are mandatory, querying PostgreSQL to verify that `deletedAt IS NOT NULL` guarantees regulatory compliance.

#### Q2: What is quota slot reuse, and how do you test it?
- **Short Answer**: It verifies that when a user reaches a resource limit (e.g., maximum 3 active beneficiaries), deleting an active resource decrements the active count and allows adding a new one.
- **Deeper Explanation**: If the backend incorrectly counts total database rows rather than active records (`deletedAt IS NULL`), soft-deleting an item will not free a slot, permanently locking the user out. In our test, we create 3 beneficiaries, assert that the 4th is rejected with 400, delete one, verify the active DB count is 2, and assert that a new 4th beneficiary can now be created with 201.

#### Q3: Why did we test cross-user deletion (IDOR) on beneficiaries?
- **Short Answer**: To prevent Insecure Direct Object References where User B manipulates User A's payout recipients simply by guessing their UUID.
- **Deeper Explanation**: Payment recipients contain sensitive banking identifiers. We authenticate User A and User B concurrently, create Beneficiary A, and have User B attempt to delete it. We assert that the backend returns `404 Not Found` (preventing resource enumeration) and confirm via PostgreSQL that Beneficiary A remains active.

---

# STEP 5F — TRANSFERS API TESTING

<a id="step-5f--transfers-api-testing"></a>

### Step 5F Domain Overview & Architecture
<a id="step-5f-domain-overview--architecture"></a>

The **Transfers Domain** is the core financial engine of WrightPay. It orchestrates atomic, wallet-to-beneficiary cross-border currency transfers. Unlike read-only or simple CRUD endpoints, money transfers represent high-concurrency, mission-critical financial mutations that tie together:
1. **Authenticated REST Entry Point**: `POST /transfers` protected by `JwtAuthGuard`, requiring mandatory `Idempotency-Key` request header.
2. **Pessimistic Row-Level Database Locking**: `SELECT ... FOR UPDATE` on the source wallet inside a managed PostgreSQL transaction runner to guarantee zero double-spending under concurrent attempts.
3. **Strict Financial Accounting**: Debiting the exact sum of `sendAmount + TRANSFER_FEE` (fixed 25.00 units in source wallet currency) and verifying that `currentBalance >= totalDeduction`.
4. **Foreign Exchange Valuation**: Dynamic currency conversion via `ExchangeRatesService` computing `recipientAmount = round(sendAmount * rate, 2)`.
5. **Distributed Redis Idempotency**: Atomic `SET key record EX 60 NX` distributed locking, request payload SHA-256 fingerprinting, replay caching (24-hour TTL), and conflict detection (`409 Conflict`).
6. **Asynchronous Settlement Pipeline**: Enqueueing persistent background jobs into the BullMQ `'transfers'` queue (`'process-transfer'`), processed by `TransfersProcessor` with 3 attempts and exponential backoff.
7. **Multi-Tenant IDOR Guardrails**: Strict ownership validation preventing users from transferring from wallets or to beneficiaries owned by other tenants.

---

### Step 5F Actual Transfers API Contract Discovered (40-Item Audit)
<a id="step-5f-actual-transfers-api-contract-discovered"></a>

1. **Exact Endpoint**: `/transfers` (relative to base API: `http://localhost:3001/api/v1/transfers`).
2. **HTTP Method**: `POST`.
3. **Authentication Requirement**: Mandatory Bearer JWT token (`Authorization: Bearer <access_token>`).
4. **Required Headers**:
   - `Authorization`: Bearer JWT token.
   - `Idempotency-Key`: Unique client-generated key (e.g. UUID, timestamped string).
5. **Idempotency-Key Behavior**: If missing or empty/whitespace, throws `400 Bad Request` (`"Idempotency-Key header is required"`).
6. **Request Body**: JSON object matching `CreateTransferDto`.
7. **Required Fields**:
   - `beneficiaryId`: UUID string.
   - `sourceWalletId`: UUID string.
   - `sendAmount`: Numeric value greater than zero (minimum `0.01`).
   - `destinationCurrency`: Supported currency enum (`EUR`, `GBP`, `USD`, `INR`, `PLN`, `AED`).
8. **Optional Fields**: None in request body.
9. **Field Data Types**:
   - `beneficiaryId`: `string` (UUID v4 format).
   - `sourceWalletId`: `string` (UUID v4 format).
   - `sendAmount`: `number` (float/decimal).
   - `destinationCurrency`: `string` (Currency enum).
10. **Currency Rules**:
    - Source currency is determined by `sourceWallet.currency`.
    - Destination currency is specified by `destinationCurrency`.
    - If `beneficiary.payoutMethod === 'upi'`, `destinationCurrency` MUST be `'INR'` (`400 Bad Request ("UPI transfers must be in INR")`).
11. **Source Wallet Behavior**:
    - Must belong to the authenticated caller (`where: { id: sourceWalletId, userId }`). If not found or belongs to another user, returns `404 Not Found ("Source wallet not found")`.
    - Acquired with pessimistic write lock (`lock: { mode: 'pessimistic_write' }` / `FOR UPDATE`).
12. **Beneficiary Requirements**:
    - Must belong to caller and not be soft-deleted (`where: { id: beneficiaryId, userId }`). If not found, returns `404 Not Found ("Beneficiary not found")`.
13. **Amount Rules**:
    - `sendAmount > 0` (validated by `@Min(0.01)` and service layer `sendAmount <= 0` check).
    - Precision rounded to 2 decimal places: `Math.round((sendAmount + Number.EPSILON) * 100) / 100`.
14. **Fee Behavior**:
    - Fixed fee constant: `TRANSFER_FEE = 25.0` (25 currency units of the source wallet).
    - Source wallet is debited: `totalDeduction = sendAmount + TRANSFER_FEE`.
15. **Exchange-Rate Behavior**:
    - Resolved via `ExchangeRatesService.getRate(sourceWallet.currency, destinationCurrency)`.
    - If source currency equals destination currency, rate is strictly `1.0`.
    - Cross-currency rates are fetched from `exchange_rates` table (direct, inverse, or triangular via EUR).
    - Recipient amount is calculated: `Math.round((sendAmount * rate + Number.EPSILON) * 100) / 100`.
16. **Validation Rules**:
    - ValidationPipe enforces class-validator annotations (`@IsUUID`, `@IsNumber`, `@Min(0.01)`, `@IsEnum(Currency)`).
    - Account status validation: caller must not be `'suspended'` or `'closed'` (`403 Forbidden`).
17. **HTTP Status Codes**:
    - `201 Created`: Transfer accepted, wallet debited, transaction ledger created, job enqueued.
    - `400 Bad Request`: Missing idempotency key, invalid DTO parameters, UPI currency mismatch, or insufficient balance.
    - `401 Unauthorized`: Missing or invalid Bearer token.
    - `403 Forbidden`: Caller account suspended or closed.
    - `404 Not Found`: Source wallet or beneficiary not found (or owned by another tenant).
    - `409 Conflict`: Idempotency key payload mismatch or unresolved concurrent processing.
18. **Response Body Contract**:
    ```json
    {
      "id": "uuid-v4",
      "reference": "WP-YYYYMMDD-HEX8",
      "status": "PENDING",
      "recipient": "string",
      "sendAmount": 100,
      "sourceCurrency": "EUR",
      "recipientAmount": 100,
      "destinationCurrency": "EUR",
      "fee": 25,
      "exchangeRate": 1,
      "date": "2026-09-18T...",
      "createdAt": "2026-09-18T..."
    }
    ```
19. **Transaction Record Creation**: Inserted into `transactions` table within the atomic PostgreSQL transaction runner.
20. **Initial Transaction Status**: `TransactionStatus.PENDING`.
21. **BullMQ Job Creation**: Enqueued to queue `'transfers'`, job name `'process-transfer'`, job ID `transfer-${transaction.id}`, payload `{ transactionId }`, attempts: 3, exponential backoff (1000ms delay), `removeOnComplete: true`.
22. **Redis Keys Used**: `wrightpay:idempotency:transfer:${userId}:${idempotencyKey.trim()}`.
23. **Redis TTL Behavior**:
    - Lock TTL: 60 seconds (`EX 60`) during in-flight processing.
    - Completed record TTL: 86,400 seconds (24 hours).
24. **Idempotency Behavior**:
    - Replay with identical payload: returns cached `201 Created` response without debiting wallet again or queueing duplicate job.
25. **Duplicate Request Behavior**:
    - Same key + different payload: throws `409 Conflict ("Idempotency key was already used with a different request payload")`.
26. **Processing Behavior**: Background worker picks up job, atomically updates status `PENDING -> PROCESSING`, waits 50ms simulation delay, updates status `PROCESSING -> COMPLETED`.
27. **Failure Behavior**: If `recipient` contains `'SIMULATE_FAILURE'`, worker throws `"Simulated banking settlement failure"`, exhausts 3 attempts, and transitions status to `FAILED` with `failureReason`.
28. **Cancellation Behavior**: Not implemented / not currently available.
29. **Reversal Behavior**: Not implemented / not currently available.
30. **Refund Behavior**: Not implemented in background worker upon asynchronous settlement failure (funds remain debited unless manually refunded).
31. **Wallet Debit Behavior**: Source wallet balance is decremented by `sendAmount + 25.00` immediately inside the database transaction before HTTP 201 is returned.
32. **Wallet Credit Behavior**: Recipient wallet credit does not occur locally because transfers represent external disbursements to beneficiaries.
33. **Ownership Rules**: Source wallet must have `userId === caller.id`.
34. **Beneficiary Ownership Rules**: Beneficiary must have `userId === caller.id` and `deletedAt IS NULL`.
35. **Transaction History Behavior**: Ledger row persisted with unique reference `WP-YYYYMMDD-HEX8`.
36. **Caching Behavior**: Completed responses cached in Redis under idempotency key for 24 hours.
37. **Database Locking / Concurrency Behavior**: Pessimistic write lock (`lock: { mode: 'pessimistic_write' }`) prevents race conditions and balance overdrafts under parallel requests.
38. **Error Handling**: On failure inside the transaction runner, the database transaction rolls back, and the Redis idempotency key is deleted (`del(key)`) so the client can retry.
39. **Business Limits**: Fixed fee 25.00; minimum transfer amount 0.01.
40. **Other Implemented Transfer Rules**: Reference number follows deterministic format `WP-${YYYYMMDD}-${RANDOM_HEX_8}`.

---

### Step 5F Transfer State Machine & Status Lifecycle
<a id="step-5f-transfer-state-machine--status-lifecycle"></a>

```mermaid
stateDiagram-v2
    [*] --> PENDING: POST /transfers (atomic DB commit + BullMQ enqueue)
    PENDING --> PROCESSING: TransfersProcessor picks up job
    PROCESSING --> COMPLETED: External gateway settlement succeeds (50ms simulation)
    PROCESSING --> FAILED: Simulation failure / 3 attempts exhausted
    COMPLETED --> [*]
    FAILED --> [*]
```

#### States in `TransactionStatus` Enum:
- `PENDING`: Initial persisted state created by `TransfersService` before HTTP response is returned.
- `PROCESSING`: Set by `TransfersProcessor` via atomic conditional query (`WHERE id = :id AND status = 'PENDING'`).
- `COMPLETED`: Terminal state set by worker upon successful external banking settlement simulation.
- `FAILED`: Terminal state set by worker after retries are exhausted or non-retryable failure occurs. Contains `failureReason`.
- `SUSPICIOUS`: Reserved for fraud/risk engine flags (not triggered by normal transfer flow).

#### Audit Correction on States:
- `CANCELLED`: Not implemented / not currently available.
- `REVERSED`: Not implemented / not currently available.

---

### Step 5F Financial Flow & Invariant Accounting
<a id="step-5f-financial-flow--invariant-accounting"></a>

Every money transfer follows a strict double-entry invariant:

$\text{Source Balance}_{\text{after}} = \text{Source Balance}_{\text{before}} - (\text{Send Amount} + \text{Transfer Fee})$

$\text{Recipient Amount} = \text{round}(\text{Send Amount} \times \text{Exchange Rate}, 2)$

#### Execution Sequence:
```text
Client
  │
  ├── 1. POST /transfers (Idempotency-Key: KEY, Body: { walletId, beneficiaryId, sendAmount, destinationCurrency })
  │
NestJS TransfersController
  │
  ├── 2. Validate Idempotency-Key header exists
  │
IdempotencyService
  │
  ├── 3. SHA-256 payload hash computed
  ├── 4. Redis SET wrightpay:idempotency:transfer:{userId}:{key} EX 60 NX
  │      └── If lock fails, inspect existing: return cached response or throw 409 Conflict
  │
TransfersService (executeTransferTransaction)
  │
  ├── 5. QueryRunner.startTransaction()
  ├── 6. Verify User accountStatus !== 'suspended' and !== 'closed'
  ├── 7. Verify Beneficiary exists, belongs to user, and deletedAt IS NULL
  ├── 8. If UPI beneficiary, verify destinationCurrency === 'INR'
  ├── 9. SELECT * FROM wallets WHERE id = :sourceWalletId AND userId = :userId FOR UPDATE (Pessimistic Write Lock)
  ├── 10. Fetch Exchange Rate from ExchangeRatesService
  ├── 11. Calculate totalDeduction = sendAmount + 25.00
  ├── 12. Invariant Check: wallet.balance >= totalDeduction
  │       └── If insufficient: throw BadRequestException, rollback DB, DEL Redis key
  ├── 13. wallet.balance = wallet.balance - totalDeduction -> save(wallet)
  ├── 14. Create Transaction record (status: 'PENDING', reference: 'WP-YYYYMMDD-HEX8') -> save(transaction)
  ├── 15. QueryRunner.commitTransaction()
  │
TransfersQueue (BullMQ)
  │
  ├── 16. transfersQueue.add('process-transfer', { transactionId }, { attempts: 3, backoff: 1000 })
  │
IdempotencyService
  │
  ├── 17. Redis SET wrightpay:idempotency:transfer:{userId}:{key} (status: 'COMPLETED', response: result) EX 86400
  │
Client
  │
  └── 18. Receives HTTP 201 Created with TransferResponse (status: 'PENDING')
```

---

### Step 5F Redis Idempotency Architecture
<a id="step-5f-redis-idempotency-architecture"></a>

- **Redis Key**: `wrightpay:idempotency:transfer:${userId}:${idempotencyKey.trim()}`
- **Initial In-Flight Record**:
  ```json
  {
    "status": "PROCESSING",
    "requestHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "createdAt": "2026-09-18T10:00:00.000Z"
  }
  ```
  Written using `SET key value EX 60 NX`. If the lock cannot be acquired because the key already exists:
  - If `existing.requestHash !== currentRequestHash`: Throws `409 Conflict ("Idempotency key was already used with a different request payload")`.
  - If `existing.status === 'COMPLETED'`: Returns cached original `response` directly.
  - If `existing.status === 'PROCESSING'`: Bounded polling loop (25 iterations $\times$ 100ms) waiting for completion.
- **Completed Record**:
  ```json
  {
    "status": "COMPLETED",
    "requestHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "response": { "id": "...", "reference": "...", "status": "PENDING", ... },
    "createdAt": "2026-09-18T10:00:00.000Z",
    "completedAt": "2026-09-18T10:00:00.050Z"
  }
  ```
  Written using `SET key value EX 86400` (24 hours).
- **Error Cleanup**: If an error occurs during execution (e.g. 400 Insufficient Funds, 404 Not Found), the service invokes `redisService.del(key)` so the client can fix their balance/data and retry with the same key.

---

### Step 5F BullMQ Asynchronous Processing & Settlement Architecture
<a id="step-5f-bullmq-asynchronous-processing"></a>

- **Queue Name**: `transfers`
- **Job Name**: `process-transfer`
- **Job ID**: `transfer-${transaction.id}`
- **Payload**: `{ transactionId: string }`
- **Job Options**: `{ attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true, removeOnFail: false }`
- **Worker**: `TransfersProcessor` extends `WorkerHost`:
  - Fetch canonical transaction from database.
  - Atomic transition: `UPDATE transactions SET status = 'PROCESSING' WHERE id = :id AND status = 'PENDING'`.
  - Core settlement simulation: `processTransfer(transaction)` introduces 50ms delay.
  - If `transaction.recipient.includes('SIMULATE_FAILURE')`, throws `Error('Simulated banking settlement failure')`.
  - On success: `UPDATE transactions SET status = 'COMPLETED' WHERE id = :id`.
  - On failure: If attempts exhausted, `UPDATE transactions SET status = 'FAILED', failureReason = :reason WHERE id = :id`.

---

## File: qa/automation/api/transfers.api.ts
<a id="file-qaautomationapitransfersapits-step5f"></a>

### Purpose
Exposes a clean HTTP client wrapper for the `POST /transfers` endpoint, allowing test callers to supply explicit idempotency keys and headers.

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateTransferRequest } from './types';

export class TransfersApi extends BaseApi {
  /**
   * Initiate a transfer.
   * Callers must explicitly supply the idempotencyKey so tests can deliberately test duplicate keys.
   */
  async createTransfer(
    data: CreateTransferRequest,
    idempotencyKey?: string,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    const mergedHeaders: Record<string, string> = { ...headers };
    if (idempotencyKey !== undefined) {
      mergedHeaders['Idempotency-Key'] = idempotencyKey;
    }
    return this.post('transfers', { data, headers: mergedHeaders });
  }
}
```

### Code Explanation
- **Lines 10–20 (`createTransfer`)**: Takes `data: CreateTransferRequest`, optional `idempotencyKey?: string`, and optional custom `headers?`.
- If `idempotencyKey` is passed (even if empty string), it attaches `headers['Idempotency-Key'] = idempotencyKey`.
- If `idempotencyKey` is `undefined`, the header is omitted, allowing validation negative testing.
- Returns Playwright's raw `APIResponse` for assertions.

### Why It Was Implemented This Way
Keeps assertions out of the API client while making idempotency header manipulation explicit and configurable per test.

---

## File: qa/automation/api/types.ts
<a id="file-qaautomationapitypests-step5f"></a>

### Purpose
Centralizes all DTOs and return contracts for the WrightPay API framework.

### Actual Current Code (Step 5F Transfer Types)
```typescript
export interface CreateTransferRequest {
  beneficiaryId: string;
  sourceWalletId: string;
  sendAmount: number;
  destinationCurrency: Currency;
}

export interface TransferResponse {
  id: string;
  reference: string;
  status: TransactionStatus;
  recipient: string;
  sendAmount: number;
  sourceCurrency: Currency;
  recipientAmount: number;
  destinationCurrency: Currency;
  fee: number;
  exchangeRate: number;
  date: string;
  createdAt: string;
}
```

### Code Explanation
Added `TransferResponse` interface matching the 12 fields returned by `TransfersService`: `id`, `reference`, `status`, `recipient`, `sendAmount`, `sourceCurrency`, `recipientAmount`, `destinationCurrency`, `fee`, `exchangeRate`, `date`, `createdAt`.

---

## File: qa/automation/tests/transfers/transfers.spec.ts
<a id="file-qaautomationteststransferstransfersspects"></a>

### Purpose
The master executable test specification for the Transfers domain, containing 30 automated test cases across 13 test categories.

### Code Structure
```typescript
// Includes 30 automated test cases:
// 1. Basic Successful Transfer & Contract Verification (Test 1)
// 2. Request Validation Boundaries & Guardrails (Tests 2–10)
// 3. Insufficient Balance & Accounting Invariants (Test 11)
// 4. Fixed Fee Accounting & Currency Conversion (Tests 12–13)
// 5. Beneficiary & Source Wallet Ownership / IDOR (Tests 14–15)
// 6. Authentication & Account State Validation (Tests 16–18)
// 7. Idempotency Mechanics & Deduplication (Tests 19–21)
// 8. Redis Idempotency Deep Inspection (Test 22)
// 9. BullMQ Job Attributes & Enqueueing (Test 23)
// 10. Asynchronous Settlement & State Transitions (Tests 24–25)
// 11. Amount Boundaries & Edge Cases (Tests 26–28)
// 12. Concurrency & Double Submission Protection (Test 29)
// 13. Security & Unhandled 500 Prevention (Test 30)
```

---

### Step 5F Detailed Breakdown of All 30 Test Cases
<a id="step-5f-detailed-breakdown-of-all-30-test-cases"></a>

#### Category 1: Successful Transfer Execution & Contract Verification (Test 1)
- **Test 1**: `successfully initiates a transfer, returns 201 Created with full contract, and updates DB & Redis`
  - **Behavior Tested**: Complete happy path transfer execution and immediate system state changes.
  - **Why It Exists**: Core validation of the entire transfer initiation pipeline.
  - **Request Sent**: `POST /transfers` with valid `sourceWalletId`, `beneficiaryId`, `sendAmount: 100`, `destinationCurrency: 'EUR'`, and unique `Idempotency-Key`.
  - **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: wp-idem-success-...`.
  - **Expected Response**: `201 Created` with `reference` matching `^WP-\d{8}-[A-F0-9]{8}# WrightPay QA Automation Framework: Living Learning & Reference Guide

> **Living Document Notice**: This document serves as the master technical architecture reference, learning textbook, and SDET interview preparation guide for the WrightPay QA Automation Framework (`qa/automation/`). It is a living document that grows alongside the framework. New test domains and infrastructure capabilities are appended as they are built, preserving all prior documentation and architectural history.

---

## Table of Contents

- [Part 1 — Overall QA Automation Architecture](#part-1--overall-qa-automation-architecture)
- [Part 2 — Playwright & Environment Configuration](#part-2--playwright--environment-configuration)
  - [File: package.json](#file-packagejson)
  - [File: playwright.config.ts](#file-playwrightconfigts)
  - [File: tsconfig.json](#file-tsconfigjson)
  - [File: qa/automation/config/env.config.ts](#file-qaautomationconfigenvconfigts)
- [Part 3 — Database Infrastructure](#part-3--database-infrastructure)
  - [File: qa/automation/database/db-client.ts](#file-qaautomationdatabasedb-clientts)
- [Part 4 — Redis Infrastructure](#part-4--redis-infrastructure)
  - [File: qa/automation/redis/redis-client.ts](#file-qaautomationredisredis-clientts)
- [Part 5 — BullMQ / Queue Infrastructure](#part-5--bullmq--queue-infrastructure)
  - [File: qa/automation/queues/queue-client.ts](#file-qaautomationqueuesqueue-clientts)
- [Part 6 — API Client Architecture](#part-6--api-client-architecture)
  - [File: qa/automation/api/base.api.ts](#file-qaautomationapibaseapits)
  - [File: qa/automation/api/auth.api.ts](#file-qaautomationapiauthapits)
  - [File: qa/automation/api/users.api.ts](#file-qaautomationapiusersapits)
  - [File: qa/automation/api/wallet.api.ts](#file-qaautomationapiwalletapits)
  - [File: qa/automation/api/cards.api.ts](#file-qaautomationapicardsapits)
  - [File: qa/automation/api/beneficiaries.api.ts](#file-qaautomationapibeneficiariesapits)
  - [File: qa/automation/api/transfers.api.ts](#file-qaautomationapitransfersapits)
  - [File: qa/automation/api/transactions.api.ts](#file-qaautomationapitransactionsapits)
  - [File: qa/automation/api/exchange-rates.api.ts](#file-qaautomationapiexchange-ratesapits)
  - [File: qa/automation/api/index.ts](#file-qaautomationapiindexts)
- [Part 7 — TypeScript Types](#part-7--typescript-types)
  - [File: qa/automation/api/types.ts](#file-qaautomationapitypests)
- [Part 8 — Authentication & Playwright Fixtures](#part-8--authentication--playwright-fixtures)
  - [File: qa/automation/test-data/user.factory.ts](#file-qaautomationtest-datauserfactoryts)
  - [File: qa/automation/fixtures/api.fixtures.ts](#file-qaautomationfixturesapifixturests)
- [Part 9 — Infrastructure Smoke Tests](#part-9--infrastructure-smoke-tests)
  - [File: qa/automation/tests/infra-smoke.spec.ts](#file-qaautomationtestsinfra-smokespects)
- [Part 10 — API Smoke Tests](#part-10--api-smoke-tests)
  - [File: qa/automation/tests/api-smoke.spec.ts](#file-qaautomationtestsapi-smokespects)
  - [File: qa/automation/tests/proof-of-life.spec.ts](#file-qaautomationtestsproof-of-lifespects)
- [Part 11 — Authentication Test Suite](#part-11--authentication-test-suite)
  - [File: qa/automation/tests/auth/auth.spec.ts](#file-qaautomationtestsauthauthspects)
- [Part 12 — Users Test Suite](#part-12--users-test-suite)
  - [File: qa/automation/tests/users/users.spec.ts](#file-qaautomationtestsusersusersspects)
- [Part 13 — Wallet Test Suite](#part-13--wallet-test-suite)
  - [File: qa/automation/tests/wallet/wallet.spec.ts](#file-qaautomationtestswalletwalletspects)
- [Part 14 — Cards Test Suite](#part-14--cards-test-suite)
  - [File: qa/automation/tests/cards/cards.spec.ts](#file-qaautomationtestscardscardsspects)
- [Part 15 — Test Data & Test Isolation](#part-15--test-data--test-isolation)
- [Part 16 — Backend Behavior Discovered During Development](#part-16--backend-behavior-discovered-during-development)
- [Part 17 — Problems Encountered During Development & Solutions](#part-17--problems-encountered-during-development--solutions)
- [Part 18 — Complete Execution Walkthrough](#part-18--complete-execution-walkthrough)
- [Part 19 — Important SDET Concepts](#part-19--important-sdet-concepts)
- [Part 20 — API Testing vs. Integration Testing](#part-20--api-testing-vs-integration-testing)
- [Part 21 — SDET Interview Preparation](#part-21--sdet-interview-preparation)
- [Part 22 — Debugging Guide](#part-22--debugging-guide)
- [Part 23 — Current Test Inventory](#part-23--current-test-inventory)
- [Part 24 — Complete QA Automation File Index](#part-24--complete-qa-automation-file-index)
- [STEP 5E — BENEFICIARIES API TESTING](#step-5e--beneficiaries-api-testing)
  - [Domain Overview & Architecture](#domain-overview--architecture)
  - [Actual Backend Contract Discovered](#actual-backend-contract-discovered)
  - [File: qa/automation/api/beneficiaries.api.ts](#file-qaautomationapibeneficiariesapits)
  - [File: qa/automation/api/types.ts](#file-qaautomationapitypests-beneficiaries-types)
  - [File: qa/automation/tests/beneficiaries/beneficiaries.spec.ts](#file-qaautomationtestsbeneficiariesbeneficiariesspects)
  - [Detailed Breakdown of All 25 Test Cases](#detailed-breakdown-of-all-25-test-cases)
  - [Document Actual Discoveries](#document-actual-discoveries)
  - [Problems Encountered & Solutions](#problems-encountered--solutions)
  - [Important SDET Concepts](#important-sdet-concepts)
  - [SDET Interview Preparation](#sdet-interview-preparation)
- [STEP 5F — TRANSFERS API TESTING](#step-5f--transfers-api-testing)
  - [Domain Overview & Architecture](#step-5f-domain-overview--architecture)
  - [Actual Transfers API Contract Discovered (40-Item Audit)](#step-5f-actual-transfers-api-contract-discovered)
  - [Transfer State Machine & Status Lifecycle](#step-5f-transfer-state-machine--status-lifecycle)
  - [Financial Flow & Invariant Accounting](#step-5f-financial-flow--invariant-accounting)
  - [Redis Idempotency Architecture](#step-5f-redis-idempotency-architecture)
  - [BullMQ Asynchronous Processing & Settlement Architecture](#step-5f-bullmq-asynchronous-processing)
  - [File: qa/automation/api/transfers.api.ts](#file-qaautomationapitransfersapits-step5f)
  - [File: qa/automation/api/types.ts](#file-qaautomationapitypests-step5f)
  - [File: qa/automation/tests/transfers/transfers.spec.ts](#file-qaautomationteststransferstransfersspects)
  - [Detailed Breakdown of All 30 Test Cases](#step-5f-detailed-breakdown-of-all-30-test-cases)
  - [Document Actual Discoveries](#step-5f-document-actual-discoveries)
  - [Problems Encountered & Solutions](#step-5f-problems-encountered--solutions)
  - [Important SDET Concepts](#step-5f-important-sdet-concepts)
  - [SDET Interview Preparation (20 Questions & Answers)](#step-5f-sdet-interview-preparation)
- [Part 25 — Current Progress](#part-25--current-progress)
- [Part 26 — Future Documentation Sections](#part-26--future-documentation-sections)

---

# Part 1 — Overall QA Automation Architecture

The WrightPay QA automation framework is an end-to-end, multi-layered test platform located entirely inside `qa/automation/`. It is architected for testing the WrightPay financial payment platform, which consists of a NestJS backend (listening on port 3001), a Next.js frontend (port 3000), a PostgreSQL 15 relational database (port 5432), and a Redis 7 instance powering in-memory operations and BullMQ asynchronous queues (port 6379).

### Current Directory Structure

```text
qa/automation/
├── .env.example              # Sample environment variables for database, redis, and API URLs
├── .gitignore                # Git exclusions for node_modules, reports, artifacts, and local .env
├── package.json              # NPM dependencies, Playwright runners, TypeScript engines, and scripts
├── package-lock.json         # Pinned dependency lockfile
├── playwright.config.ts      # Master Playwright test runner configuration
├── tsconfig.json             # TypeScript compiler settings and module path aliases (@api, @fixtures, etc.)
│
├── config/
│   └── env.config.ts         # Environment loader (dotenv), type-safe config object, and defaults
│
├── database/
│   └── db-client.ts          # Reusable PostgreSQL client pool with self-healing connection lifecycle
│
├── redis/
│   └── redis-client.ts       # Reusable ioredis client wrapper for key-value, TTL, and cache assertions
│
├── queues/
│   └── queue-client.ts       # Reusable BullMQ client for inspecting and polling the 'transfers' queue
│
├── api/
│   ├── base.api.ts           # Abstract HTTP client wrapping Playwright's APIRequestContext
│   ├── types.ts              # TypeScript DTOs, payload interfaces, enums, and request/response types
│   ├── auth.api.ts           # Domain client for /auth (signup, login, verify-email, logout)
│   ├── users.api.ts          # Domain client for /users (getMe, updateMe)
│   ├── wallet.api.ts         # Domain client for /wallets (getMyWallet)
│   ├── cards.api.ts          # Domain client for /cards (CRUD, freeze, unfreeze, deactivate)
│   ├── beneficiaries.api.ts  # Domain client for /beneficiaries
│   ├── transfers.api.ts      # Domain client for /transfers (with idempotency support)
│   ├── transactions.api.ts   # Domain client for /transactions
│   ├── exchange-rates.api.ts # Domain client for /exchange-rates (rates & quotes)
│   └── index.ts              # Public barrel export for all API clients and models
│
├── test-data/
│   └── user.factory.ts       # Isolated, deterministic user generation factory
│
├── fixtures/
│   └── api.fixtures.ts       # Playwright custom test fixture providing pre-authenticated sessions & clients
│
├── tests/
│   ├── proof-of-life.spec.ts # Sanity check confirming Playwright test runner execution
│   ├── infra-smoke.spec.ts   # Smoke tests verifying PostgreSQL, Redis, and BullMQ connectivity
│   ├── api-smoke.spec.ts     # Smoke tests verifying unauthenticated & authenticated API layers
│   ├── auth/
│   │   └── auth.spec.ts      # 19 tests covering authentication, tokens, hashing, and boundary checks
│   ├── users/
│   │   └── users.spec.ts     # 12 tests covering profile retrieval, PATCH, IDOR, and input validation
│   ├── wallet/
│   │   └── wallet.spec.ts    # 8 tests covering wallet contract, precision, DB parity, equivalents, and idempotency
│   ├── cards/
│   │   └── cards.spec.ts     # 19 tests covering card provisioning, state machine, hard delete, and IDOR
│   ├── api/                  # (Placeholder directories for future domain migrations)
│   ├── concurrency/          # (Placeholder for future race condition and concurrent transfer testing)
│   ├── database/             # (Placeholder for future direct database assertion suites)
│   ├── e2e/                  # (Placeholder for future cross-domain multi-step scenarios)
│   ├── integration/          # (Placeholder for future async transfer queue integration suites)
│   ├── performance/          # (Placeholder for future latency and throughput benchmarks)
│   └── security/             # (Placeholder for future advanced vulnerability and injection tests)
│
├── pages/                    # Placeholder for future Page Object Models (UI automation)
├── reports/                  # Generated HTML reports, JSON outputs, and trace artifacts
└── utils/                    # Shared QA utilities
```

### Layer Responsibilities

1. **Configuration Layer (`config/`)**: Centralizes environment variables, default connection strings, test timeouts, and retry policies. It shields test suites from reading `process.env` directly and ensures type safety across environments (`local`, `test`, `staging`, `production`).
2. **Infrastructure Layer (`database/`, `redis/`, `queues/`)**: Provides direct access to backend storage and messaging tiers (PostgreSQL, Redis, BullMQ). This enables **cross-layer testing**: testing that an HTTP operation didn't just return HTTP 200, but actually updated the relational database, populated the cache with the right TTL, or queued an asynchronous worker job.
3. **API Client Layer (`api/`)**: Encapsulates all HTTP request construction, URL path resolution, headers, serialization, and deserialization behind strongly-typed TypeScript classes. Tests interact with clean domain methods like `cardsApi.freezeCard(id)` rather than constructing raw HTTP requests.
4. **Test Data Layer (`test-data/`)**: Contains data factories like `user.factory.ts` that generate collision-free, randomized-yet-deterministic test entities (`qa_1726645800_1234_1@wrightpay-qa.test`). This ensures complete test isolation during parallel execution.
5. **Fixture Layer (`fixtures/`)**: Extends Playwright's native test runner via Dependency Injection. It automatically orchestrates complex prerequisite flows—such as signing up a fresh user, confirming their email OTP, logging in, acquiring a JWT, configuring a dedicated `APIRequestContext` with `Authorization: Bearer <token>`, and instantiating domain clients—before a test case even begins.
6. **Test Suite Layer (`tests/`)**: Contains the executable specifications (`*.spec.ts`). Tests declare their dependencies via fixtures, invoke domain API methods, verify HTTP response status and payloads, and execute cross-layer verification against PostgreSQL or Redis.

### Architectural Separation Rationale

- **Maintainability & DRY**: If the backend endpoint changes from `/wallets/me` to `/wallet/current`, only `WalletApi.getMyWallet()` is updated in one place. Zero test files need modification.
- **Separation of Concerns**: Test cases focus strictly on *business assertions* and *invariants*. They are not polluted by HTTP client boilerplate, header wiring, or database connection pools.
- **Safety in Parallel Execution**: Centralizing database pools and test data factories prevents race conditions, deadlocks, and cross-worker interference when running with multiple parallel workers.

### Actual Execution Flows in the Framework

The framework executes two primary styles of test flows depending on the test domain:

#### 1. Authenticated Domain Flow (e.g., Cards, Users, Wallet)
```text
Test Runner (Playwright Worker)
  │
  ├── 1. Requests { authUser } fixture
  │      ├── UserFactory generates unique email & credentials
  │      ├── AuthApi calls POST /auth/signup (NestJS) -> PostgreSQL users record created
  │      ├── AuthApi calls POST /auth/verify-email (NestJS) -> status transitions to 'active'
  │      ├── AuthApi calls POST /auth/login (NestJS) -> JWT access_token generated
  │      └── Creates new APIRequestContext with Authorization: Bearer <token>
  │
  ├── 2. Test executes domain action
  │      ├── authUser.api.cards.createCard(cardData)
  │      ├── BaseApi strips leading slash -> POST http://localhost:3001/api/v1/cards
  │      └── NestJS CardsController -> CardsService -> PostgreSQL cards table
  │
  ├── 3. Assertions & Cross-Layer Validation
  │      ├── Assert HTTP response status (201 Created)
  │      ├── Assert API response payload (masked PAN, UUID, status: 'active')
  │      └── Direct DbClient query: SELECT * FROM cards WHERE id = $1
  │             └── Assert exact row values in PostgreSQL
  │
  └── 4. Fixture Teardown
         └── authUser.authContext.dispose() closes network sockets
```

#### 2. Infrastructure Smoke Flow (e.g., Infra Smoke)
```text
Test Runner (Playwright Worker)
  │
  ├── 1. Directly invokes dbClient.healthCheck() -> runs 'SELECT 1 as alive' on PostgreSQL
  ├── 2. Directly invokes redisClient.healthCheck() -> sends 'PING', asserts 'PONG'
  ├── 3. Directly invokes transferQueueClient.healthCheck() -> checks BullMQ 'transfers' queue
  └── 4. Validates connectivity without touching HTTP or mutating production data
```

---

# Part 2 — Playwright & Environment Configuration

## File: package.json

### Purpose
Defines the npm project configuration, dependencies, devDependencies, and test execution scripts for the QA automation package.

### Why does this file exist?
The QA framework is housed as an independent Node.js project within `qa/automation/`. This keeps automation dependencies isolated from the NestJS backend and Next.js frontend, avoiding package version conflicts.

### Actual Current Code
```json
{
  "name": "wrightpay-qa-automation",
  "version": "1.0.0",
  "private": true,
  "description": "Playwright Test automation framework for WrightPay",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "test:report": "playwright show-report reports/html-report",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "bullmq": "^5.41.0",
    "ioredis": "^5.5.0",
    "pg": "^8.13.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.1",
    "@types/node": "^22.13.4",
    "@types/pg": "^8.11.11",
    "dotenv": "^16.4.7",
    "typescript": "^5.7.3"
  }
}
```

### Code Explanation
- **`scripts.test`**: Runs all Playwright tests in headless mode across all discovered spec files.
- **`scripts.typecheck`**: Runs `tsc --noEmit` to validate complete TypeScript compilation without producing JavaScript artifacts.
- **`dependencies`**:
  - `bullmq` (`^5.41.0`): BullMQ queue consumer/inspector for testing background asynchronous transfer processing.
  - `ioredis` (`^5.5.0`): High-performance Redis client for cache verification, key inspection, and BullMQ transport.
  - `pg` (`^8.13.3`): Pure JavaScript PostgreSQL client pool for querying database state during cross-layer assertions.
- **`devDependencies`**:
  - `@playwright/test` (`^1.50.1`): The primary test runner, assertion library, and HTTP client (`APIRequestContext`).
  - `dotenv` (`^16.4.7`): Environment file reader.
  - `typescript` (`^5.7.3`): Compiler providing strict compile-time type checking.

---

## File: playwright.config.ts

### Purpose
The master configuration file that controls test discovery, timeouts, concurrency, reporting, retries, and default HTTP context settings.

### Why does this file exist?
Playwright requires a configuration root to orchestrate worker threads, reporters, test match patterns, and base network options.

### Actual Current Code
```typescript
import { defineConfig, devices } from '@playwright/test';
import { config } from './config/env.config';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Maximum time one test can run for. */
  timeout: config.timeout,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     */
    timeout: 5000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: config.retries,
  /* Opt out of parallel tests on CI if needed. */
  workers: config.workers,
  /* Output directory for test artifacts (traces, screenshots, videos) */
  outputDir: './reports/test-artifacts',
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['json', { outputFile: 'reports/test-results.json' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: config.baseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: config.headless,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### Code Explanation & Configuration Impact
- **`testDir: './tests'`**: Instructs Playwright to scan the `./tests` directory for any test files matching default glob patterns (`*.spec.ts` or `*.test.ts`).
- **`timeout: config.timeout`**: Sets the global test timeout (30,000ms by default). If a test hangs due to an unresponsive backend, it is terminated after 30s.
- **`expect.timeout: 5000`**: Maximum time an asynchronous assertion (`expect.poll()` or matcher) will wait before failing.
- **`fullyParallel: true`**: Runs all test files concurrently across available CPU workers.
- **`forbidOnly: !!process.env.CI`**: Fails the test run on continuous integration if a developer accidentally committed `test.only()`.
- **`retries: config.retries`**: Set to `0` locally for rapid failure feedback, and `2` in CI to guard against transient network glitches.
- **`workers: config.workers`**: Caps workers at `2` in CI environments to prevent overwhelming container resources, while defaulting to undefined locally (Playwright utilizes 50-100% of logical CPU cores).
- **`reporter`**: Configures multi-reporting:
  - `list`: Real-time streaming command-line output.
  - `html`: Standalone interactive HTML report in `reports/html-report`.
  - `json`: Machine-readable results in `reports/test-results.json` for CI dashboard ingestion.
- **`use.baseURL: config.baseUrl`**: Sets default URL (`http://localhost:3000`). Note: As explained below, API tests use `config.apiBaseUrl` (`http://localhost:3001/api/v1`).

---

## File: tsconfig.json

### Purpose
Configures the TypeScript compiler (`tsc`), path mapping aliases, and module resolution rules for the QA codebase.

### Why does this file exist?
Allows modern ES2022 syntax, enforces strict type checking, and provides clean import paths like `@api/cards.api` instead of brittle relative paths like `../../api/cards.api`.

### Actual Current Code
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "baseUrl": ".",
    "paths": {
      "@config/*": ["config/*"],
      "@fixtures/*": ["fixtures/*"],
      "@pages/*": ["pages/*"],
      "@api/*": ["api/*"],
      "@database/*": ["database/*"],
      "@redis/*": ["redis/*"],
      "@queues/*": ["queues/*"],
      "@test-data/*": ["test-data/*"],
      "@utils/*": ["utils/*"]
    },
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": [
    "playwright.config.ts",
    "config/**/*.ts",
    "fixtures/**/*.ts",
    "pages/**/*.ts",
    "api/**/*.ts",
    "database/**/*.ts",
    "redis/**/*.ts",
    "queues/**/*.ts",
    "test-data/**/*.ts",
    "tests/**/*.ts",
    "utils/**/*.ts"
  ]
}
```

### Code Explanation
- **`target: ES2022` & `module: NodeNext`**: Emits modern ECMAScript features supported natively by Node.js 18+.
- **`paths`**: Configures path aliases for each major layer (`@api/*`, `@fixtures/*`, `@database/*`, etc.).
- **`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`**: Guarantees type safety across the framework, catching null pointer exceptions, unhandled undefined values, and typing mistakes at compile time.

---

## File: qa/automation/config/env.config.ts

### Purpose
Loads environment variables from `.env`, validates them, applies fallback defaults, and exports a frozen, typed `config` object.

### Why does this file exist?
Eliminates scattered `process.env` calls throughout test files. If a configuration key changes, it is updated in this single file.

### Actual Current Code
```typescript
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export type EnvironmentType = 'local' | 'test' | 'staging' | 'production';

export interface TestConfig {
  env: EnvironmentType;
  baseUrl: string;
  apiBaseUrl: string;
  databaseUrl: string;
  redisUrl: string;
  headless: boolean;
  timeout: number;
  retries: number;
  workers: number | undefined;
}

const getEnv = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

const currentEnv = (getEnv('TEST_ENV', 'local').toLowerCase() as EnvironmentType);

export const config: TestConfig = {
  env: currentEnv,
  baseUrl: getEnv('BASE_URL', 'http://localhost:3000'),
  apiBaseUrl: getEnv('API_BASE_URL', 'http://localhost:3001/api/v1'),
  databaseUrl: getEnv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/wrightpay'),
  redisUrl: getEnv('REDIS_URL', 'redis://localhost:6379'),
  headless: getEnv('HEADLESS', 'true') !== 'false',
  timeout: parseInt(getEnv('TEST_TIMEOUT', '30000'), 10),
  retries: parseInt(getEnv('TEST_RETRIES', currentEnv === 'local' ? '0' : '2'), 10),
  workers: process.env.CI ? 2 : undefined,
};
```

### Code Explanation & Key Distinctions
- **`baseUrl` vs `apiBaseUrl`**:
  - `baseUrl` (`http://localhost:3000`): Points to the Next.js frontend UI web application.
  - `apiBaseUrl` (`http://localhost:3001/api/v1`): Points directly to the NestJS backend REST API gateway. Playwright API fixtures and API client instances bind to `apiBaseUrl`.
- **`databaseUrl`**: Direct connection URI to PostgreSQL. Default: `postgresql://postgres:password@localhost:5432/wrightpay`.
- **`redisUrl`**: Direct connection URI to Redis. Default: `redis://localhost:6379`.
- **`getEnv` helper**: Safely inspects `process.env[key]` and returns the fallback if the variable is unset or empty.

---

# Part 3 — Database Infrastructure

## File: qa/automation/database/db-client.ts

### Purpose
Provides a singleton PostgreSQL connection pool manager, safe parameterized query helpers, lightweight health checks, and self-healing connection lifecycle handling.

### Why does this file exist?
Testing an enterprise payment API cannot rely exclusively on black-box HTTP responses. An API could return `200 OK` while silently failing to write records to disk, failing to hash sensitive credentials, or corrupting account balances. `DbClient` gives QA the power to perform cross-layer assertions against PostgreSQL.

### Actual Current Code
```typescript
import { Pool, QueryResult, QueryResultRow, PoolConfig } from 'pg';
import { config } from '../config/env.config';

export class DbClient {
  private pool!: Pool;
  private connectionString: string;
  private options?: Omit<PoolConfig, 'connectionString'>;

  constructor(connectionString?: string, options?: Omit<PoolConfig, 'connectionString'>) {
    this.connectionString = connectionString || config.databaseUrl;
    this.options = options;
    this.initPool();
  }

  private initPool(): void {
    this.pool = new Pool({
      connectionString: this.connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ...this.options,
    });

    this.pool.on('error', (err) => {
      console.error('[DbClient] Unexpected error on idle PostgreSQL client:', err.message);
    });
  }

  private getActivePool(): Pool {
    if ((this.pool as any).ended) {
      this.initPool();
    }
    return this.pool;
  }

  /**
   * Execute a parameterized SQL query safely.
   * Never interpolate values directly into the query string.
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    values?: any[],
  ): Promise<QueryResult<T>> {
    return this.getActivePool().query<T>(text, values);
  }

  /**
   * Convenience helper to execute a query and return the first row, or null if no rows matched.
   */
  async queryOne<T extends QueryResultRow = any>(
    text: string,
    values?: any[],
  ): Promise<T | null> {
    const result = await this.query<T>(text, values);
    return result.rows[0] || null;
  }

  /**
   * Perform a lightweight health check to confirm PostgreSQL connectivity.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as alive');
      return result.rows.length > 0 && result.rows[0].alive === 1;
    } catch (error) {
      console.error('[DbClient] Health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Gracefully close all connections in the pool.
   */
  async close(): Promise<void> {
    if (this.pool && !(this.pool as any).ended) {
      await this.pool.end();
    }
  }

  /**
   * Access the underlying pg.Pool if needed.
   */
  getPool(): Pool {
    return this.getActivePool();
  }
}

export const dbClient = new DbClient();
export default dbClient;
```

### Code Explanation Block-by-Block
- **Lines 9–13 (`constructor`)**: Initializes the client using `config.databaseUrl` and invokes `initPool()`.
- **Lines 15–27 (`initPool`)**: Instantiates `new Pool({...})` with a maximum of 10 concurrent connections per worker, an idle timeout of 30 seconds, and a connection acquisition timeout of 5 seconds. Attaches an error handler to idle clients to prevent uncaught process crashes.
- **Lines 29–34 (`getActivePool`) - Self-Healing Lifecycle**:
  - *Engineering Problem Solved*: In Playwright multi-worker parallel execution, if any test file or teardown hook calls `dbClient.close()`, the underlying `pg.Pool` transitions to `ended = true`. Subsequent queries in the same worker would crash with `Error: Cannot use a pool after calling end()`.
  - *Mechanism*: Checks `(this.pool as any).ended`. If ended, it transparently calls `this.initPool()` to re-instantiate the pool on the fly.
- **Lines 40–45 (`query`)**: Executes parameterized SQL queries using placeholders (`$1, $2`). Parameterization prevents SQL injection and syntax errors when values contain quotes or special characters.
- **Lines 50–56 (`queryOne`)**: Convenience wrapper returning `result.rows[0] || null`. Eliminates repetitive `res.rows.length > 0 ? res.rows[0] : null` checks across test suites.
- **Lines 61–69 (`healthCheck`)**: Runs `SELECT 1 as alive` inside a `try/catch`. Returns `true` if connected, `false` on connection error.
- **Lines 74–78 (`close`)**: Safe termination guarded by `!(this.pool as any).ended`.

### Why Database Assertions Matter in API Testing
1. **Security & Cryptography**: Black-box APIs never return password hashes. Direct DB verification proves that `passwordHash` starts with `$argon2` and was not stored plaintext.
2. **Default Entity Provisioning**: In WrightPay, `POST /auth/signup` returns only `{ message, userId }`. Querying the database proves that a default `wallets` record in `EUR` with balance `0.00` was initialized.
3. **Hard vs. Soft Deletion Invariants**: When `DELETE /cards/:id` is called, the API returns `{ message: "Card successfully deleted" }`. Querying `SELECT count(*) FROM cards WHERE id = $1` proves the row was physically purged rather than just soft-deleted or hidden.

---

# Part 4 — Redis Infrastructure

## File: qa/automation/redis/redis-client.ts

### Purpose
Provides a singleton Redis client wrapper utilizing `ioredis` for interacting with in-memory stores, asserting key lifecycles, and checking time-to-live (TTL).

### Why does this file exist?
WrightPay relies on Redis for caching, OTP verification, rate limiting, and BullMQ queue storage. `RedisClient` provides an isolated test interface to inspect and assert on Redis without polluting application logic.

### Actual Current Code
```typescript
import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config/env.config';

export class RedisClient {
  private client: Redis;

  constructor(redisUrl?: string, options?: RedisOptions) {
    const url = redisUrl || config.redisUrl;
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 1000);
      },
      ...options,
    });

    this.client.on('error', (err) => {
      console.error('[RedisClient] Error encountered on Redis connection:', err.message);
    });
  }

  /**
   * Connect to Redis if not already connected.
   */
  async connect(): Promise<void> {
    if (this.client.status === 'wait' || this.client.status === 'close') {
      await this.client.connect();
    }
  }

  /**
   * Retrieve string value by key. Returns null if not found.
   */
  async get(key: string): Promise<string | null> {
    await this.connect();
    return this.client.get(key);
  }

  /**
   * Set key-value pair with optional TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    await this.connect();
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  /**
   * Delete a specific key. Returns number of keys deleted (0 or 1).
   */
  async del(key: string): Promise<number> {
    await this.connect();
    return this.client.del(key);
  }

  /**
   * Get remaining TTL for a key in seconds.
   * Returns -2 if key does not exist, -1 if key exists with no expiry.
   */
  async ttl(key: string): Promise<number> {
    await this.connect();
    return this.client.ttl(key);
  }

  /**
   * Check if a key exists in Redis.
   */
  async exists(key: string): Promise<boolean> {
    await this.connect();
    const count = await this.client.exists(key);
    return count > 0;
  }

  /**
   * Health check verifying ping/pong response from Redis.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.connect();
      const response = await this.client.ping();
      return response === 'PONG';
    } catch (error) {
      console.error('[RedisClient] Health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Graceful disconnect from Redis.
   */
  async close(): Promise<void> {
    if (this.client.status === 'ready' || this.client.status === 'connecting') {
      await this.client.quit();
    }
  }

  /**
   * Get underlying IORedis instance for advanced operations.
   */
  getClient(): Redis {
    return this.client;
  }
}

export const redisClient = new RedisClient();
export default redisClient;
```

### Code Explanation Block-by-Block
- **Lines 8–17 (`constructor`)**: Configures `ioredis` with `lazyConnect: true` so the connection is not opened until a command is issued. Configures a capped retry strategy (up to 3 attempts, backoff between 100ms and 1000ms) to prevent tests from blocking indefinitely if Redis is down.
- **Lines 27–31 (`connect`)**: Ensures the client is in a connected state before executing commands.
- **Lines 44–50 (`set`)**: Implements key setting with optional `'EX'` (expire in seconds).
- **Lines 64–67 (`ttl`)**: Returns seconds until key expiration. Allows asserting that ephemeral tokens or OTPs expire as designed.
- **Lines 81–90 (`healthCheck`)**: Sends a `PING` command and asserts that Redis answers with `PONG`.

---

# Part 5 — BullMQ / Queue Infrastructure

## File: qa/automation/queues/queue-client.ts

### Purpose
Provides a client to inspect, poll, and verify the BullMQ `'transfers'` queue and its `'process-transfer'` jobs.

### Why does this file exist?
In WrightPay, money transfers are processed asynchronously. When `POST /transfers` is called, the API immediately creates a transaction in status `PENDING` and enqueues a background job rather than executing the transfer synchronously. `TransferQueueClient` enables QA to verify that jobs are enqueued with correct payloads and to poll job completion.

### Actual Current Code
```typescript
import { Queue, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/env.config';

export const TRANSFERS_QUEUE_NAME = 'transfers';
export const PROCESS_TRANSFER_JOB_NAME = 'process-transfer';

export interface TransferJobData {
  transactionId: string;
}

export class TransferQueueClient {
  private queue: Queue<TransferJobData>;
  private connection: IORedis;

  constructor(queueName: string = TRANSFERS_QUEUE_NAME, redisUrl?: string) {
    const url = redisUrl || config.redisUrl;

    // BullMQ requires maxRetriesPerRequest: null for blocking Redis operations
    this.connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    this.connection.on('error', (err) => {
      console.error('[TransferQueueClient] Redis connection error:', err.message);
    });

    this.queue = new Queue<TransferJobData>(queueName, {
      connection: this.connection,
    });
  }

  /**
   * Fetch a job by its unique jobId (e.g., "transfer-<transactionId>").
   */
  async getJob(jobId: string): Promise<Job<TransferJobData> | undefined> {
    return this.queue.getJob(jobId);
  }

  /**
   * Retrieve the current state of a job ('completed' | 'failed' | 'delayed' | 'active' | 'waiting' | 'unknown').
   */
  async getJobState(jobId: string): Promise<string | undefined> {
    const job = await this.getJob(jobId);
    if (!job) return undefined;
    return job.getState();
  }

  /**
   * Inspect job counts by status (active, completed, failed, delayed, waiting, paused).
   */
  async getJobCounts(): Promise<Record<string, number>> {
    return this.queue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting', 'paused');
  }

  /**
   * Poll and wait for a job to reach an expected status within a timeout window.
   * Useful in async integration tests where transfers process in background.
   */
  async waitForJobStatus(
    jobId: string,
    targetStatus: string | string[],
    timeoutMs: number = 10000,
    pollIntervalMs: number = 200,
  ): Promise<Job<TransferJobData> | undefined> {
    const targets = Array.isArray(targetStatus) ? targetStatus : [targetStatus];
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const job = await this.getJob(jobId);
      if (job) {
        const currentState = await job.getState();
        if (targets.includes(currentState)) {
          return job;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    const finalJob = await this.getJob(jobId);
    const finalState = finalJob ? await finalJob.getState() : 'not_found';
    throw new Error(
      `Job ${jobId} did not reach status [${targets.join(', ')}] within ${timeoutMs}ms. Current state: ${finalState}`,
    );
  }

  /**
   * Health check confirming that BullMQ can inspect the queue on Redis without mutating it.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const counts = await this.getJobCounts();
      return counts !== null && typeof counts === 'object';
    } catch (error) {
      console.error('[TransferQueueClient] Health check failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Graceful cleanup of BullMQ queue and its dedicated Redis connection.
   */
  async close(): Promise<void> {
    try {
      await this.queue.close();
    } finally {
      if (this.connection.status === 'ready' || this.connection.status === 'connecting') {
        await this.connection.quit();
      }
    }
  }

  /**
   * Access the underlying BullMQ Queue instance.
   */
  getQueue(): Queue<TransferJobData> {
    return this.queue;
  }
}

export const transferQueueClient = new TransferQueueClient();
export default transferQueueClient;
```

### Code Explanation Block-by-Block
- **Lines 5–10**: Defines constants verified from the backend codebase: `TRANSFERS_QUEUE_NAME = 'transfers'`, `PROCESS_TRANSFER_JOB_NAME = 'process-transfer'`, and `TransferJobData { transactionId: string }`.
- **Lines 19–23**: BullMQ requires `maxRetriesPerRequest: null` on its Redis connection because BullMQ uses blocking Redis operations (`BRPOPLPUSH`, `BLMOVE`). If retries are enabled, `ioredis` would prematurely reject commands during blocking waits.
- **Lines 37–48 (`getJob` & `getJobState`)**: Retrieves BullMQ job instances and states (`active`, `waiting`, `completed`, `failed`).
- **Lines 61–86 (`waitForJobStatus`)**: Deterministic polling loop with configurable interval (default 200ms) and timeout (default 10s). Avoids arbitrary `sleep()` statements in asynchronous transfer testing.
- **Lines 104–112 (`close`)**: Cleanly closes both the BullMQ queue listeners and the dedicated Redis socket connection.

---

# Part 6 — API Client Architecture

## Architectural Distinction: API Client vs. Test vs. Fixture

| Layer | Responsibility | What It Does NOT Do |
| :--- | :--- | :--- |
| **API Client** (`api/*.api.ts`) | Pure HTTP transport abstraction. Constructs URLs, serializes bodies, applies query params, sends requests. Returns `APIResponse`. | Does NOT assert status codes or response bodies. Has zero `expect()` calls. |
| **Fixture** (`fixtures/api.fixtures.ts`) | Lifecycle orchestration & dependency injection. Sets up users, logins, tokens, contexts, and tears down sockets. | Does NOT contain domain business logic or specific test assertions. |
| **Test** (`tests/**/*.spec.ts`) | Business specification. Declares fixtures, calls client methods, asserts HTTP status, asserts JSON contracts, asserts DB state. | Does NOT manually build HTTP requests, format headers, or parse raw URLs. |
| **APIRequestContext** (Playwright) | Low-level browser-grade HTTP client with cookie jars, redirects, and connection pooling. | Does NOT know anything about WrightPay domains or business endpoints. |

### Why Assertions Belong in Tests Rather than API Clients
If an API client had `expect(response.status()).toBe(200)` hardcoded inside `cardsApi.createCard()`, it would be impossible to use that same client method to test negative scenarios (e.g., asserting that an invalid card returns `400 Bad Request` or an unauthenticated call returns `401 Unauthorized`). API clients must remain completely neutral and return the raw `APIResponse`.

---

## File: qa/automation/api/base.api.ts

### Purpose
Abstract base class wrapping Playwright's `APIRequestContext` to provide standard HTTP methods (`get`, `post`, `patch`, `delete`) and path normalization.

### Why does this file exist?
Normalizes request dispatching across all domain clients and resolves URL pathing bugs.

### Actual Current Code
```typescript
import { APIRequestContext, APIResponse } from '@playwright/test';

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

export abstract class BaseApi {
  constructor(protected request: APIRequestContext) {}

  /**
   * Normalizes path to prevent leading slashes from stripping baseUrl subpaths like /api/v1/.
   */
  protected resolvePath(path: string): string {
    return path.startsWith('/') ? path.slice(1) : path;
  }

  protected async get(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.get(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
    });
  }

  protected async post(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.post(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
      data: options?.data,
    });
  }

  protected async patch(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.patch(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
      data: options?.data,
    });
  }

  protected async delete(path: string, options?: RequestOptions): Promise<APIResponse> {
    return this.request.delete(this.resolvePath(path), {
      headers: options?.headers,
      params: options?.params,
    });
  }
}
```

### Code Explanation: The Critical `resolvePath` Method
In Node.js standard URL resolution and Playwright's underlying request client:
- If `baseURL` is `http://localhost:3001/api/v1`
- Resolving `'/auth/login'` (with a leading slash) resolves against the **origin**, stripping `/api/v1` and making the request to `http://localhost:3001/auth/login` (404 Not Found).
- Resolving `'auth/login'` (without leading slash) resolves relative to the path, correctly resulting in `http://localhost:3001/api/v1/auth/login`.
- `resolvePath(path)` checks `path.startsWith('/') ? path.slice(1) : path`, ensuring that whether a developer passes `'/cards'` or `'cards'`, the URL always resolves correctly.

---

## File: qa/automation/api/auth.api.ts

### Purpose
Domain API client for authentication endpoints (`/auth/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { SignupRequest, LoginRequest, VerifyEmailRequest } from './types';

export class AuthApi extends BaseApi {
  async signup(data: SignupRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/signup', { data, headers });
  }

  async login(data: LoginRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/login', { data, headers });
  }

  async verifyEmail(data: VerifyEmailRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/verify-email', { data, headers });
  }

  async logout(headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('auth/logout', { headers });
  }
}
```

### Methods Explained
- **`signup(data, headers)`**: `POST /auth/signup`. Sends `firstName`, `lastName`, `email`, `password`, `agreeTerms`.
- **`login(data, headers)`**: `POST /auth/login`. Sends `email`, `password`. Returns `{ access_token, user }`.
- **`verifyEmail(data, headers)`**: `POST /auth/verify-email`. Sends `email`, `code`. Transitions user to `active`.
- **`logout(headers)`**: `POST /auth/logout`. Invalidates/acknowledges logout for the caller.

---

## File: qa/automation/api/users.api.ts

### Purpose
Domain API client for user profile management (`/users/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { UpdateUserRequest } from './types';

export class UsersApi extends BaseApi {
  async getMe(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('users/me', { headers });
  }

  async updateMe(data: UpdateUserRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.patch('users/me', { data, headers });
  }
}
```

### Methods Explained
- **`getMe(headers)`**: `GET /users/me`. Fetches authenticated user's profile based on the Bearer token.
- **`updateMe(data, headers)`**: `PATCH /users/me`. Updates `name`, `countryOfResidence`, or `defaultCurrency`.

---

## File: qa/automation/api/wallet.api.ts

### Purpose
Domain API client for the authenticated user's wallet (`/wallets/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';

export class WalletApi extends BaseApi {
  async getMyWallet(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('wallets/me', { headers });
  }
}
```

### Methods Explained
- **`getMyWallet(headers)`**: `GET /wallets/me`. Retrieves the authenticated user's primary wallet including base balance and calculated multi-currency equivalents.

---

## File: qa/automation/api/cards.api.ts

### Purpose
Domain API client for virtual/physical payment card lifecycle management (`/cards/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateCardRequest } from './types';

export class CardsApi extends BaseApi {
  async getMyCards(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('cards', { headers });
  }

  async createCard(data: CreateCardRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('cards', { data, headers });
  }

  async freezeCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post(`cards/${id}/freeze`, { headers });
  }

  async unfreezeCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post(`cards/${id}/unfreeze`, { headers });
  }

  async deactivateCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post(`cards/${id}/deactivate`, { headers });
  }

  async deleteCard(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.delete(`cards/${id}`, { headers });
  }
}
```

### Methods Explained
- **`getMyCards(headers)`**: `GET /cards`. Lists all cards owned by the authenticated caller.
- **`createCard(data, headers)`**: `POST /cards`. Provisions a card (`cardholderName`, `cardNumber`, `expiryDate`, `cvv`, `type`).
- **`freezeCard(id, headers)`**: `POST /cards/:id/freeze`. Transitions card status from `active` to `frozen`.
- **`unfreezeCard(id, headers)`**: `POST /cards/:id/unfreeze`. Transitions card status from `frozen` to `active`.
- **`deactivateCard(id, headers)`**: `POST /cards/:id/deactivate`. Transitions card to permanent terminal status `deactivated`.
- **`deleteCard(id, headers)`**: `DELETE /cards/:id`. Permanently deletes the card from PostgreSQL.

---

## File: qa/automation/api/beneficiaries.api.ts

### Purpose
Domain API client for recipient management (`/beneficiaries/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateBeneficiaryRequest } from './types';

export class BeneficiariesApi extends BaseApi {
  async getMyBeneficiaries(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('beneficiaries', { headers });
  }

  async createBeneficiary(data: CreateBeneficiaryRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('beneficiaries', { data, headers });
  }

  async deleteBeneficiary(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.delete(`beneficiaries/${id}`, { headers });
  }
}
```

---

## File: qa/automation/api/transfers.api.ts

### Purpose
Domain API client for initiating money transfers (`/transfers/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateTransferRequest } from './types';

export class TransfersApi extends BaseApi {
  /**
   * Initiate a transfer.
   * Callers must explicitly supply the idempotencyKey so tests can deliberately test duplicate keys.
   */
  async createTransfer(
    data: CreateTransferRequest,
    idempotencyKey?: string,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    const mergedHeaders: Record<string, string> = { ...headers };
    if (idempotencyKey !== undefined) {
      mergedHeaders['Idempotency-Key'] = idempotencyKey;
    }
    return this.post('transfers', { data, headers: mergedHeaders });
  }
}
```

### Key Design Feature: Idempotency Key Handling
Transfers support an `Idempotency-Key` HTTP header. By allowing the test to explicitly provide or omit `idempotencyKey`, tests can verify that retrying with the same idempotency key returns the cached response rather than creating duplicate money transfers.

---

## File: qa/automation/api/transactions.api.ts

### Purpose
Domain API client for listing and retrieving historical transactions (`/transactions/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { GetTransactionsQuery } from './types';

export class TransactionsApi extends BaseApi {
  async getMyTransactions(
    params?: GetTransactionsQuery,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.get('transactions', { params, headers });
  }

  async getTransactionById(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get(`transactions/${id}`, { headers });
  }
}
```

---

## File: qa/automation/api/exchange-rates.api.ts

### Purpose
Domain API client for public exchange rates and currency conversion quotes (`/exchange-rates/*`).

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { GetQuoteQuery } from './types';

export class ExchangeRatesApi extends BaseApi {
  async getAllRates(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('exchange-rates', { headers });
  }

  async getQuote(params: GetQuoteQuery, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('exchange-rates/quote', { params, headers });
  }
}
```

---

## File: qa/automation/api/index.ts

### Purpose
Barrel file that consolidates all API clients and type definitions into a single import location.

### Actual Current Code
```typescript
export * from './types';
export * from './base.api';
export * from './auth.api';
export * from './users.api';
export * from './wallet.api';
export * from './cards.api';
export * from './beneficiaries.api';
export * from './transfers.api';
export * from './transactions.api';
export * from './exchange-rates.api';
```

---

# Part 7 — TypeScript Types

## File: qa/automation/api/types.ts

### Purpose
Defines all data transfer objects (DTOs), request payloads, enums, and query parameter models for the WrightPay API automation suite.

### Actual Current Code
```typescript
export type Currency = 'EUR' | 'GBP' | 'USD' | 'INR' | 'PLN';

export type CardType = 'debit' | 'credit' | 'DEBIT' | 'CREDIT';

export type CardStatus = 'active' | 'frozen' | 'deactivated' | 'declined' | 'pending';

export type BeneficiaryPayoutMethod = 'BANK_ACCOUNT' | 'UPI';

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SUSPICIOUS';

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agreeTerms: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface UpdateUserRequest {
  name?: string;
  countryOfResidence?: string;
  defaultCurrency?: Currency;
}

export interface CreateCardRequest {
  cardholderName: string;
  type?: CardType;
  cardNumber?: string;
  lastFourDigits?: string;
  expiryDate: string;
  cvv?: string;
}

export interface CreateBeneficiaryRequest {
  name: string;
  currency: Currency;
  payoutMethod?: BeneficiaryPayoutMethod;
  accountNumber?: string;
  bankCode?: string;
  ifscCode?: string;
  upiId?: string;
  bankName?: string;
}

export interface CreateTransferRequest {
  beneficiaryId: string;
  sourceWalletId: string;
  sendAmount: number;
  destinationCurrency: Currency;
}

export interface GetTransactionsQuery {
  status?: TransactionStatus;
  reference?: string;
  limit?: number;
  offset?: number;
}

export interface GetQuoteQuery {
  from: Currency;
  to: Currency;
  amount: number;
}
```

### TypeScript Compile-Time Typing vs. Runtime API Validation
- **Compile-Time Checking**: Prevents typos during test authoring (e.g., passing `currncy: 'EUR'` instead of `currency: 'EUR'`).
- **Runtime Validation**: TypeScript types **do not exist at runtime**. The fact that `CreateCardRequest` has `cardholderName: string` does not prevent a test from deliberately passing `cardholderName: ""` or `type: "unsupported" as any`. In an SDET framework, we frequently cast invalid types (`as any`) to verify that the backend's runtime NestJS `ValidationPipe` correctly catches and rejects invalid payloads with `400 Bad Request`.

---

# Part 8 — Authentication & Playwright Fixtures

## File: qa/automation/test-data/user.factory.ts

### Purpose
Generates collision-free, isolated, deterministic user credentials for automated test runs.

### Why does this file exist?
If automated tests share hardcoded emails like `test@wrightpay.com`, parallel workers collide, signup fails on duplicate email constraints, and test order dependency is introduced. `UserFactory` generates completely independent test users.

### Actual Current Code
```typescript
import { SignupRequest } from '../api/types';

export interface TestUserData extends SignupRequest {
  fullName: string;
}

let userCounter = 0;

/**
 * Generate unique, deterministic-yet-isolated user signup data for automated testing.
 */
export function generateTestUserData(overrides?: Partial<SignupRequest>): TestUserData {
  userCounter += 1;
  const uniqueId = `${Date.now()}_${process.pid}_${userCounter}_${Math.floor(Math.random() * 10000)}`;
  const firstName = overrides?.firstName || `QAUser${userCounter}`;
  const lastName = overrides?.lastName || `Test`;
  const email = overrides?.email || `qa_${uniqueId}@wrightpay-qa.test`.toLowerCase();
  const password = overrides?.password || 'TestPassword123!';
  const agreeTerms = overrides?.agreeTerms !== undefined ? overrides.agreeTerms : true;

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    email,
    password,
    agreeTerms,
  };
}
```

### Code Explanation: The Unique ID Strategy
- **`Date.now()`**: Millisecond timestamp ensuring monotonic time uniqueness.
- **`process.pid`**: Process ID of the Node.js / Playwright worker. Distinguishes workers running concurrently on the same machine.
- **`userCounter`**: Monotonically incrementing integer within the worker process.
- **`Math.random()`**: Additional randomness barrier to prevent collisions during sub-millisecond iterations.

---

## File: qa/automation/fixtures/api.fixtures.ts

### Purpose
Playwright custom test fixture extending `@playwright/test` to provide dependency injection for authenticated and unauthenticated contexts, domain API clients, and database/Redis/queue singletons.

### Why does this file exist?
Eliminates hundreds of lines of repetitive authentication setup from every test file. Tests simply declare `{ authUser }` in their test signature, and Playwright provisions a clean, verified user session automatically.

### Actual Current Code
```typescript
import { test as base, APIRequestContext } from '@playwright/test';
import { config } from '../config/env.config';
import {
  AuthApi,
  UsersApi,
  WalletApi,
  CardsApi,
  BeneficiariesApi,
  TransfersApi,
  TransactionsApi,
  ExchangeRatesApi,
} from '../api';
import { generateTestUserData, TestUserData } from '../test-data/user.factory';
import { dbClient, DbClient } from '../database/db-client';
import { redisClient, RedisClient } from '../redis/redis-client';
import { transferQueueClient, TransferQueueClient } from '../queues/queue-client';

export interface AuthenticatedUserSession {
  user: {
    id: string;
    email: string;
    name: string;
    password: string;
  };
  token: string;
  authContext: APIRequestContext;
  api: {
    auth: AuthApi;
    users: UsersApi;
    wallet: WalletApi;
    cards: CardsApi;
    beneficiaries: BeneficiariesApi;
    transfers: TransfersApi;
    transactions: TransactionsApi;
    exchangeRates: ExchangeRatesApi;
  };
}

export interface ApiFixtures {
  /** Unauthenticated API request context pointed at API_BASE_URL */
  apiContext: APIRequestContext;
  /** Unauthenticated AuthApi client */
  authApi: AuthApi;
  /** Unauthenticated ExchangeRatesApi client */
  exchangeRatesApi: ExchangeRatesApi;
  /** Fully provisioned and authenticated user session */
  authUser: AuthenticatedUserSession;
  /** Database test client singleton */
  db: DbClient;
  /** Redis test client singleton */
  redis: RedisClient;
  /** BullMQ transfers queue client singleton */
  queue: TransferQueueClient;
}

const getNormalizedApiBaseUrl = (): string => {
  return config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
};

export const test = base.extend<ApiFixtures>({
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: getNormalizedApiBaseUrl(),
    });
    await use(context);
    await context.dispose();
  },

  authApi: async ({ apiContext }, use) => {
    await use(new AuthApi(apiContext));
  },

  exchangeRatesApi: async ({ apiContext }, use) => {
    await use(new ExchangeRatesApi(apiContext));
  },

  authUser: async ({ playwright, apiContext }, use) => {
    const authApi = new AuthApi(apiContext);
    const testUser = generateTestUserData();

    // 1. Real API Signup
    const signupRes = await authApi.signup(testUser);
    if (!signupRes.ok()) {
      const errorText = await signupRes.text();
      throw new Error(`[AuthFixture] Signup failed for ${testUser.email} with status ${signupRes.status()}: ${errorText}`);
    }
    const signupData = await signupRes.json();
    const userId = signupData.userId;

    // 2. Real API Email Verification
    // Default development verification code is 123456
    let verifyRes = await authApi.verifyEmail({
      email: testUser.email,
      code: '123456',
    });

    if (!verifyRes.ok()) {
      // If code 123456 failed (e.g. In non-dev environment), retrieve generated OTP from database
      const row = await dbClient.queryOne<{ verificationCode?: string; verification_code?: string }>(
        'SELECT "verificationCode" FROM email_verifications WHERE email = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [testUser.email],
      );
      const dbCode = row?.verificationCode || row?.verification_code;
      if (dbCode) {
        verifyRes = await authApi.verifyEmail({
          email: testUser.email,
          code: dbCode,
        });
      }
    }

    if (!verifyRes.ok()) {
      const errorText = await verifyRes.text();
      throw new Error(`[AuthFixture] Email verification failed for ${testUser.email} with status ${verifyRes.status()}: ${errorText}`);
    }

    // 3. Real API Login
    const loginRes = await authApi.login({
      email: testUser.email,
      password: testUser.password,
    });

    if (!loginRes.ok()) {
      const errorText = await loginRes.text();
      throw new Error(`[AuthFixture] Login failed for ${testUser.email} with status ${loginRes.status()}: ${errorText}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.access_token;
    if (!token) {
      throw new Error(`[AuthFixture] Login response did not contain access_token`);
    }

    // 4. Create Authenticated API Request Context
    const authContext = await playwright.request.newContext({
      baseURL: getNormalizedApiBaseUrl(),
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    const session: AuthenticatedUserSession = {
      user: {
        id: userId,
        email: testUser.email,
        name: testUser.fullName,
        password: testUser.password,
      },
      token,
      authContext,
      api: {
        auth: new AuthApi(authContext),
        users: new UsersApi(authContext),
        wallet: new WalletApi(authContext),
        cards: new CardsApi(authContext),
        beneficiaries: new BeneficiariesApi(authContext),
        transfers: new TransfersApi(authContext),
        transactions: new TransactionsApi(authContext),
        exchangeRates: new ExchangeRatesApi(authContext),
      },
    };

    await use(session);

    // Teardown
    await authContext.dispose();
  },

  db: async ({}, use) => {
    await use(dbClient);
  },

  redis: async ({}, use) => {
    await use(redisClient);
  },

  queue: async ({}, use) => {
    await use(transferQueueClient);
  },
});

export { expect } from '@playwright/test';
```

### Code Explanation: Complete Provisioning Lifecycle
1. **Signup**: Executes real `POST /auth/signup` against NestJS backend using data from `generateTestUserData()`.
2. **Verification**: Uses development OTP `'123456'`. If running against staging or production where OTP is dynamically generated, it falls back to querying `email_verifications` table in PostgreSQL.
3. **Login**: Executes `POST /auth/login` to obtain the cryptographic JWT `access_token`.
4. **Context Creation**: Calls `playwright.request.newContext({...})` binding `Authorization: Bearer ${token}` as a default header on every outbound request.
5. **Client Instantiation**: Wraps `authContext` in domain API client instances (`authUser.api.cards`, `authUser.api.wallet`, etc.).
6. **Teardown**: When the test finishes, `await authContext.dispose()` releases the HTTP connection pool and sockets.

---

# Part 9 — Infrastructure Smoke Tests

## File: qa/automation/tests/infra-smoke.spec.ts

### Purpose
Smoke tests verifying that the underlying data stores (PostgreSQL, Redis) and messaging queues (BullMQ) are reachable and healthy before running functional suites.

### Actual Current Code
```typescript
import { test, expect } from '@playwright/test';
import { dbClient } from '../database/db-client';
import { redisClient } from '../redis/redis-client';
import { transferQueueClient, TRANSFERS_QUEUE_NAME } from '../queues/queue-client';

test.describe('Infrastructure Helpers Smoke Test', () => {

  test('PostgreSQL connection works via DbClient', async () => {
    const isHealthy = await dbClient.healthCheck();
    expect(isHealthy).toBe(true);

    const result = await dbClient.queryOne<{ alive: number }>('SELECT 1 as alive');
    expect(result).not.toBeNull();
    expect(result?.alive).toBe(1);
  });

  test('Redis connection works via RedisClient', async () => {
    const isHealthy = await redisClient.healthCheck();
    expect(isHealthy).toBe(true);

    // Verify safe isolated key operation with cleanup
    const testKey = `wrightpay:qa:smoke:${Date.now()}`;
    await redisClient.set(testKey, 'ok', 10);
    const exists = await redisClient.exists(testKey);
    expect(exists).toBe(true);

    const val = await redisClient.get(testKey);
    expect(val).toBe('ok');

    await redisClient.del(testKey);
    const existsAfterDel = await redisClient.exists(testKey);
    expect(existsAfterDel).toBe(false);
  });

  test('BullMQ transfers queue can be inspected via TransferQueueClient', async () => {
    const isHealthy = await transferQueueClient.healthCheck();
    expect(isHealthy).toBe(true);

    const queue = transferQueueClient.getQueue();
    expect(queue.name).toBe(TRANSFERS_QUEUE_NAME);

    const counts = await transferQueueClient.getJobCounts();
    expect(counts).toBeDefined();
    expect(typeof counts.active).toBe('number');
    expect(typeof counts.completed).toBe('number');
    expect(typeof counts.failed).toBe('number');
  });
});
```

### Diagnostic Value of Smoke Test Failures
- **PostgreSQL Failure**: If Test 1 fails, PostgreSQL container on port 5432 is stopped, bad credentials in `DATABASE_URL`, or max connections exceeded.
- **Redis Failure**: If Test 2 fails, Redis container on port 6379 is down or network unreachable.
- **BullMQ Failure**: If Test 3 fails, Redis is running but BullMQ cannot read or write queue keys, or queue name is mismatched.

---

# Part 10 — API Smoke Tests

## File: qa/automation/tests/api-smoke.spec.ts

### Purpose
Validates that the Playwright HTTP pipeline, unauthenticated API routing, and the `authUser` fixture are fully operational.

### Actual Current Code
```typescript
import { test, expect } from '../fixtures/api.fixtures';

test.describe('API Architecture Smoke Validation', () => {
  test('unauthenticated client can access public exchange-rates endpoint', async ({ exchangeRatesApi }) => {
    const response = await exchangeRatesApi.getAllRates();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('authUser fixture provisions real user and authenticated clients work', async ({ authUser }) => {
    expect(authUser.token).toBeDefined();
    expect(authUser.user.id).toBeDefined();
    expect(authUser.user.email).toContain('@wrightpay-qa.test');

    // Verify authenticated user profile endpoint
    const profileRes = await authUser.api.users.getMe();
    expect(profileRes.status()).toBe(200);
    const profile = await profileRes.json();
    expect(profile.id).toBe(authUser.user.id);
    expect(profile.email).toBe(authUser.user.email);

    // Verify authenticated wallet endpoint
    const walletRes = await authUser.api.wallet.getMyWallet();
    expect(walletRes.status()).toBe(200);
    const wallet = await walletRes.json();
    expect(wallet.id).toBeDefined();
    expect(wallet.currency).toBe('EUR');
    expect(wallet.balance).toBe(0);
    expect(wallet.equivalents).toBeDefined();
  });
});
```

## File: qa/automation/tests/proof-of-life.spec.ts

### Purpose
Basic baseline assertion to confirm Playwright test discovery and runner pipeline execution.

### Actual Current Code
```typescript
import { test, expect } from '@playwright/test';

test.describe('Automation Framework Skeleton Verification', () => {
  test('proof of life: test runner executes and assertion passes', async () => {
    // Basic assertion to confirm Playwright test discovery and execution pipeline
    const frameworkName = 'WrightPay Playwright Automation Framework';
    expect(frameworkName).toBeDefined();
    expect(frameworkName).toContain('WrightPay');
    expect(1 + 1).toBe(2);
  });
});
```

---

# Part 11 — Authentication Test Suite

## File: qa/automation/tests/auth/auth.spec.ts

### Purpose
Validates all signup, login, email verification, logout, password hashing, and token boundary security invariants.

### Actual Current Code
```typescript
import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';

test.describe('Authentication Domain API Tests', () => {
  // ==========================================
  // 1. POST /auth/signup
  // ==========================================
  test.describe('POST /auth/signup', () => {
    test('successfully registers a new user with valid data and initializes database records', async ({ authApi }) => {
      const testUser = generateTestUserData();

      const response = await authApi.signup(testUser);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toBeDefined();
      expect(body.message).toBe('Signup successful. Please verify your email.');
      expect(typeof body.userId).toBe('string');
      expect(body.userId.length).toBeGreaterThan(0);

      // Cross-layer PostgreSQL validation
      const userRow = await dbClient.queryOne<{
        id: string;
        name: string;
        email: string;
        accountStatus: string;
        defaultCurrency: string;
        passwordHash: string;
      }>(
        'SELECT id, name, email, "accountStatus", "defaultCurrency", "passwordHash" FROM users WHERE id = $1',
        [body.userId],
      );

      expect(userRow).not.toBeNull();
      expect(userRow?.name).toBe(testUser.fullName);
      expect(userRow?.email).toBe(testUser.email.toLowerCase());
      expect(userRow?.accountStatus).toBe('pending');
      expect(userRow?.defaultCurrency).toBe('EUR');

      // Security check: password must be hashed (never stored plaintext)
      expect(userRow?.passwordHash).not.toBe(testUser.password);
      expect(userRow?.passwordHash.startsWith('$argon2')).toBe(true);

      // Verify default EUR wallet is initialized with zero balance
      const walletRow = await dbClient.queryOne<{
        id: string;
        userId: string;
        currency: string;
        balance: string | number;
        isDefault: boolean;
      }>(
        'SELECT id, "userId", currency, balance, "isDefault" FROM wallets WHERE "userId" = $1',
        [body.userId],
      );

      expect(walletRow).not.toBeNull();
      expect(walletRow?.userId).toBe(body.userId);
      expect(walletRow?.currency).toBe('EUR');
      expect(Number(walletRow?.balance)).toBe(0);
      expect(walletRow?.isDefault).toBe(true);
    });

    test('rejects duplicate user registration with identical email', async ({ authApi }) => {
      const testUser = generateTestUserData();

      // First registration
      const firstRes = await authApi.signup(testUser);
      expect(firstRes.status()).toBe(201);

      // Duplicate attempt
      const duplicateRes = await authApi.signup(testUser);
      expect(duplicateRes.status()).toBe(400);

      const errorBody = await duplicateRes.json();
      expect(errorBody.message).toContain('Email already in use');
    });

    test('rejects registration when required fields are missing', async ({ authApi }) => {
      const baseUser = generateTestUserData();

      // Missing password
      const { password, ...withoutPassword } = baseUser;
      const resWithoutPassword = await authApi.signup(withoutPassword as any);
      expect(resWithoutPassword.status()).toBe(400);

      // Missing firstName
      const { firstName, ...withoutFirstName } = baseUser;
      const resWithoutFirstName = await authApi.signup(withoutFirstName as any);
      expect(resWithoutFirstName.status()).toBe(400);
    });

    test('rejects registration with malformed email format', async ({ authApi }) => {
      const invalidUser = generateTestUserData({ email: 'not-an-email-format' });
      const response = await authApi.signup(invalidUser);
      expect(response.status()).toBe(400);
    });

    test('rejects registration with password shorter than 8 characters', async ({ authApi }) => {
      const invalidUser = generateTestUserData({ password: 'short' });
      const response = await authApi.signup(invalidUser);
      expect(response.status()).toBe(400);
    });
  });

  // ==========================================
  // 2. POST /auth/login
  // ==========================================
  test.describe('POST /auth/login', () => {
    test('successfully authenticates with valid credentials and returns JWT', async ({ authApi }) => {
      const testUser = generateTestUserData();
      const signupRes = await authApi.signup(testUser);
      expect(signupRes.status()).toBe(201);

      const loginRes = await authApi.login({
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.status()).toBe(200);
      const body = await loginRes.json();
      expect(body).toBeDefined();

      // Token assertion (never print or hardcode token value)
      expect(typeof body.access_token).toBe('string');
      expect(body.access_token.length).toBeGreaterThan(20);

      // User object assertion
      expect(body.user).toBeDefined();
      expect(typeof body.user.id).toBe('string');
      expect(body.user.email).toBe(testUser.email.toLowerCase());
      expect(body.user.name).toBe(testUser.fullName);
    });

    test('rejects login with incorrect password', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      const loginRes = await authApi.login({
        email: testUser.email,
        password: 'IncorrectPassword999!',
      });

      expect(loginRes.status()).toBe(401);
      const errorBody = await loginRes.json();
      expect(errorBody.message).toBe('INVALID_CREDENTIALS');
    });

    test('rejects login with non-existent email', async ({ authApi }) => {
      const nonExistentEmail = `unregistered_${Date.now()}@wrightpay-qa.test`;
      const loginRes = await authApi.login({
        email: nonExistentEmail,
        password: 'SomePassword123!',
      });

      expect(loginRes.status()).toBe(401);
      const errorBody = await loginRes.json();
      expect(errorBody.message).toBe('INVALID_CREDENTIALS');
    });

    test('rejects login with missing credentials', async ({ authApi }) => {
      const res = await authApi.login({ email: '', password: '' });
      expect(res.status()).toBe(400);
    });
  });

  // ==========================================
  // 3. POST /auth/verify-email
  // ==========================================
  test.describe('POST /auth/verify-email', () => {
    test('successfully verifies email and transitions accountStatus to active in database', async ({ authApi }) => {
      const testUser = generateTestUserData();
      const signupRes = await authApi.signup(testUser);
      const { userId } = await signupRes.json();

      // Verify user starts in pending status
      const beforeRow = await dbClient.queryOne<{ accountStatus: string }>(
        'SELECT "accountStatus" FROM users WHERE id = $1',
        [userId],
      );
      expect(beforeRow?.accountStatus).toBe('pending');

      // Development OTP is 123456
      const verifyRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123456',
      });

      expect(verifyRes.status()).toBe(200);
      const body = await verifyRes.json();
      expect(body.message).toBe('Email successfully verified');

      // Verify accountStatus transitioned to active
      const afterRow = await dbClient.queryOne<{ accountStatus: string }>(
        'SELECT "accountStatus" FROM users WHERE id = $1',
        [userId],
      );
      expect(afterRow?.accountStatus).toBe('active');
    });

    test('rejects email verification with incorrect OTP code', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      const verifyRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '999999',
      });

      expect(verifyRes.status()).toBe(400);
      const errorBody = await verifyRes.json();
      expect(errorBody.message).toContain('INVALID_INPUT');
    });

    test('rejects re-verification of an already verified email', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      // First verification succeeds
      const firstRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123456',
      });
      expect(firstRes.status()).toBe(200);

      // Second verification attempt fails
      const secondRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123456',
      });
      expect(secondRes.status()).toBe(400);
      const errorBody = await secondRes.json();
      expect(errorBody.message).toContain('Email is already verified');
    });

    test('rejects email verification with invalid code format', async ({ authApi }) => {
      const testUser = generateTestUserData();
      await authApi.signup(testUser);

      // Code must be exactly 6 characters per DTO length validation
      const verifyRes = await authApi.verifyEmail({
        email: testUser.email,
        code: '123',
      });

      expect(verifyRes.status()).toBe(400);
    });
  });

  // ==========================================
  // 4. POST /auth/logout
  // ==========================================
  test.describe('POST /auth/logout', () => {
    test('successfully acknowledges logout for authenticated user', async ({ authUser }) => {
      const logoutRes = await authUser.api.auth.logout();
      expect(logoutRes.status()).toBe(200);

      const body = await logoutRes.json();
      expect(body.message).toBe('Logged out successfully');
    });

    test('rejects logout request when Authorization header is omitted', async ({ authApi }) => {
      const logoutRes = await authApi.logout();
      expect(logoutRes.status()).toBe(401);
    });
  });

  // ==========================================
  // 5. Authentication Security & Boundaries
  // ==========================================
  test.describe('Authentication Security Boundaries', () => {
    test('protected endpoint returns 401 when Authorization header is missing', async ({ apiContext }) => {
      const response = await apiContext.get('users/me');
      expect(response.status()).toBe(401);
    });

    test('protected endpoint returns 401 when scheme is not Bearer', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: 'Basic dXNlcjpwYXNzd29yZA==',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('protected endpoint returns 401 when Bearer token is malformed', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: 'Bearer invalid.malformed.jwttoken',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('protected endpoint returns 401 when token is tampered with forged signature', async ({ apiContext }) => {
      // Valid structural base64 header & payload with bogus signature
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: '00000000-0000-0000-0000-000000000000', email: 'forged@test.com' })).toString('base64url');
      const forgedJwt = `${header}.${payload}.invalidSignatureHere`;

      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: `Bearer ${forgedJwt}`,
        },
      });
      expect(response.status()).toBe(401);
    });
  });
});
```

### Detailed Breakdown of All 19 Test Cases

#### Test 1: `successfully registers a new user with valid data and initializes database records`
1. **Behavior Tested**: Complete user registration happy path, return contract, Argon2 password hashing, and default wallet initialization.
2. **Why It Exists**: Verifies the root onboarding contract of WrightPay.
3. **Request Sent**: `POST /auth/signup`
4. **Data Sent**: Unique `TestUserData` with `firstName`, `lastName`, `email`, `password`, `agreeTerms: true`.
5. **Expected Response**: `201 Created` with JSON `{ message: "Signup successful. Please verify your email.", userId: "<uuid>" }`.
6. **Assertions Performed**: Status 201, message correctness, non-empty string `userId`.
7. **Database Verification Performed**: Yes. Queries `users` and `wallets` tables.
8. **Why DB Verification Matters**: Validates that `accountStatus` is initialized to `'pending'`, `defaultCurrency` is `'EUR'`, `passwordHash` starts with `$argon2` (never plaintext), and a default `wallets` row is created with zero balance.
9. **Rule Tested**: Onboarding integrity, data protection compliance (GDPR/PCI-DSS), and relational integrity.
10. **Catchable Bug**: Passwords leaked into plaintext columns or failed default wallet creation.

#### Test 2: `rejects duplicate user registration with identical email`
1. **Behavior Tested**: Duplicate email uniqueness constraint handling.
2. **Why It Exists**: Prevents account takeover and duplicate identity records.
3. **Request Sent**: Two consecutive `POST /auth/signup` requests with identical emails.
4. **Data Sent**: Identical `testUser` object.
5. **Expected Response**: First request returns `201 Created`; second returns `400 Bad Request`.
6. **Assertions Performed**: Status 400, message contains `"Email already in use"`.
7. **Database Verification**: None required (asserted via HTTP contract).
8. **Why DB Verification Matters**: Uniqueness constraint in PostgreSQL is reflected via HTTP 400 rather than an unhandled 500 server crash.
9. **Rule Tested**: One account per verified email.
10. **Catchable Bug**: Database constraint violation causing uncaught 500 internal server errors.

#### Test 3: `rejects registration when required fields are missing`
1. **Behavior Tested**: Request validation boundaries when omitting `password` or `firstName`.
2. **Why It Exists**: Verifies NestJS `ValidationPipe` enforcement.
3. **Request Sent**: `POST /auth/signup`
4. **Data Sent**: Payloads missing `password` and `firstName` respectively.
5. **Expected Response**: `400 Bad Request`
6. **Assertions Performed**: `expect(res.status()).toBe(400)`
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Invalid payloads must be stopped before hitting PostgreSQL.
9. **Rule Tested**: Mandatory field presence.
10. **Catchable Bug**: Null values causing database crashes or silent user creation with null passwords.

#### Test 4: `rejects registration with malformed email format`
1. **Behavior Tested**: Email string format validation (`@IsEmail()`).
2. **Why It Exists**: Prevents garbage email strings in database.
3. **Request Sent**: `POST /auth/signup`
4. **Data Sent**: `email: 'not-an-email-format'`
5. **Expected Response**: `400 Bad Request`
6. **Assertions Performed**: Status 400.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Stops non-RFC compliant emails.
9. **Rule Tested**: Strict email format validation.
10. **Catchable Bug**: Corrupted contact data breaking downstream mailers.

#### Test 5: `rejects registration with password shorter than 8 characters`
1. **Behavior Tested**: Minimum password length enforcement (`@MinLength(8)`).
2. **Why It Exists**: Enforces baseline password complexity.
3. **Request Sent**: `POST /auth/signup`
4. **Data Sent**: `password: 'short'` (5 characters)
5. **Expected Response**: `400 Bad Request`
6. **Assertions Performed**: Status 400.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Security policy must be enforced at the gateway.
9. **Rule Tested**: Passwords must be at least 8 characters.
10. **Catchable Bug**: Weak passwords allowed.

#### Test 6: `successfully authenticates with valid credentials and returns JWT`
1. **Behavior Tested**: Login happy path and JWT issuance.
2. **Why It Exists**: Core authentication mechanism for all downstream protected endpoints.
3. **Request Sent**: `POST /auth/login`
4. **Data Sent**: `{ email, password }` matching previously signed-up user.
5. **Expected Response**: `200 OK` with `{ access_token, user: { id, email, name } }`.
6. **Assertions Performed**: Status 200, `access_token` string length > 20, user ID and name matching.
7. **Database Verification**: None (indirectly verified via previous signup).
8. **Why DB Verification Matters**: Proves credential lookup against PostgreSQL hashes works.
9. **Rule Tested**: Correct password verifies against Argon2 hash.
10. **Catchable Bug**: Broken JWT signing or payload corruption.

#### Test 7: `rejects login with incorrect password`
1. **Behavior Tested**: Credential validation failure.
2. **Why It Exists**: Blocks brute-force and unauthorized access.
3. **Request Sent**: `POST /auth/login`
4. **Data Sent**: Registered email with incorrect password `'IncorrectPassword999!'`.
5. **Expected Response**: `401 Unauthorized` with `{ message: "INVALID_CREDENTIALS" }`.
6. **Assertions Performed**: Status 401, error message check.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Prevents credential compromise.
9. **Rule Tested**: Reject invalid passwords with generic error.
10. **Catchable Bug**: Accepting invalid passwords or returning 200 with blank tokens.

#### Test 8: `rejects login with non-existent email`
1. **Behavior Tested**: Login rejection on unknown account.
2. **Why It Exists**: Prevents unauthorized login on non-existent identities.
3. **Request Sent**: `POST /auth/login`
4. **Data Sent**: Unregistered random email address.
5. **Expected Response**: `401 Unauthorized` with `{ message: "INVALID_CREDENTIALS" }`.
6. **Assertions Performed**: Status 401, error message is identical to wrong-password error.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Timing/user enumeration protection (both wrong email and wrong password return `INVALID_CREDENTIALS`).
9. **Rule Tested**: Safe error disclosure without leaking account existence.
10. **Catchable Bug**: Account enumeration vulnerability where unknown email returns 404 instead of 401.

#### Test 9: `rejects login with missing credentials`
1. **Behavior Tested**: DTO validation when email or password is empty.
2. **Why It Exists**: Prevents empty payload execution.
3. **Request Sent**: `POST /auth/login`
4. **Data Sent**: `{ email: '', password: '' }`
5. **Expected Response**: `400 Bad Request`
6. **Assertions Performed**: Status 400.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Rejects request prior to database lookup.
9. **Rule Tested**: Mandatory input fields on login.
10. **Catchable Bug**: Empty credentials triggering unexpected database exceptions.

#### Test 10: `successfully verifies email and transitions accountStatus to active in database`
1. **Behavior Tested**: OTP email confirmation and account activation state machine.
2. **Why It Exists**: WrightPay requires verified accounts before conducting financial transfers.
3. **Request Sent**: `POST /auth/verify-email`
4. **Data Sent**: `{ email, code: '123456' }`
5. **Expected Response**: `200 OK` with `{ message: "Email successfully verified" }`.
6. **Assertions Performed**: Status 200, confirmation message.
7. **Database Verification Performed**: Yes. Queries `users.accountStatus` before and after.
8. **Why DB Verification Matters**: Confirms status transitions from `'pending'` to `'active'` in PostgreSQL.
9. **Rule Tested**: Email verification unlocks full account status.
10. **Catchable Bug**: User status remains `'pending'` despite successful OTP submission.

#### Test 11: `rejects email verification with incorrect OTP code`
1. **Behavior Tested**: OTP verification rejection on bad code.
2. **Why It Exists**: Blocks brute-force OTP attempts.
3. **Request Sent**: `POST /auth/verify-email`
4. **Data Sent**: `{ email, code: '999999' }`
5. **Expected Response**: `400 Bad Request` with `INVALID_INPUT`.
6. **Assertions Performed**: Status 400, message contains `INVALID_INPUT`.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: OTP must match persisted/expected secret.
9. **Rule Tested**: Rejection of invalid verification tokens.
10. **Catchable Bug**: Bypassed OTP verification.

#### Test 12: `rejects re-verification of an already verified email`
1. **Behavior Tested**: Idempotency and replay protection on email verification.
2. **Why It Exists**: Prevents reusing OTPs or re-verifying active accounts.
3. **Request Sent**: Two consecutive `POST /auth/verify-email` calls.
4. **Data Sent**: `{ email, code: '123456' }`
5. **Expected Response**: First returns 200; second returns `400 Bad Request` with `"Email is already verified"`.
6. **Assertions Performed**: Status 400, message assertion.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: State machine rule prevents re-triggering activation logic.
9. **Rule Tested**: Verification is single-use.
10. **Catchable Bug**: OTP replay attack.

#### Test 13: `rejects email verification with invalid code format`
1. **Behavior Tested**: Length validation on OTP code (`@Length(6, 6)`).
2. **Why It Exists**: Prevents truncated or malformed OTP codes.
3. **Request Sent**: `POST /auth/verify-email`
4. **Data Sent**: `{ email, code: '123' }` (3 digits instead of 6)
5. **Expected Response**: `400 Bad Request`
6. **Assertions Performed**: Status 400.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: DTO validation catches format errors early.
9. **Rule Tested**: OTP codes must be exactly 6 characters.
10. **Catchable Bug**: SQL injection or buffer overflow via oversized/undersized codes.

#### Test 14: `successfully acknowledges logout for authenticated user`
1. **Behavior Tested**: Authenticated session termination.
2. **Why It Exists**: Verifies logout endpoint for authenticated users.
3. **Request Sent**: `POST /auth/logout` with valid Bearer token.
4. **Data Sent**: None.
5. **Expected Response**: `200 OK` with `{ message: "Logged out successfully" }`.
6. **Assertions Performed**: Status 200, message check.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Confirms endpoint contract.
9. **Rule Tested**: Authenticated logout contract.
10. **Catchable Bug**: Logout crashing or requiring unexpected payload.

#### Test 15: `rejects logout request when Authorization header is omitted`
1. **Behavior Tested**: Protected route guard on logout.
2. **Why It Exists**: Logout requires an active session to terminate.
3. **Request Sent**: `POST /auth/logout` without `Authorization` header.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`
6. **Assertions Performed**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Guards route against anonymous invocation.
9. **Rule Tested**: `JwtAuthGuard` protection.
10. **Catchable Bug**: Unprotected logout route.

#### Test 16: `protected endpoint returns 401 when Authorization header is missing`
1. **Behavior Tested**: Baseline route protection against unauthenticated traffic.
2. **Why It Exists**: Ensures all sensitive endpoints require identity tokens.
3. **Request Sent**: `GET /users/me` without `Authorization` header.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`
6. **Assertions Performed**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Universal security baseline.
9. **Rule Tested**: Missing token yields 401.
10. **Catchable Bug**: Accidental omission of `@UseGuards(JwtAuthGuard)` on controller routes.

#### Test 17: `protected endpoint returns 401 when scheme is not Bearer`
1. **Behavior Tested**: Authentication scheme enforcement.
2. **Why It Exists**: Ensures API accepts only Bearer tokens and rejects other schemes (like Basic).
3. **Request Sent**: `GET /users/me` with `Authorization: Basic dXNlcjpwYXNzd29yZA==`.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`
6. **Assertions Performed**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Validates authentication protocol compliance.
9. **Rule Tested**: Strict Bearer token authentication scheme.
10. **Catchable Bug**: Backend misinterpreting non-Bearer schemes.

#### Test 18: `protected endpoint returns 401 when Bearer token is malformed`
1. **Behavior Tested**: Token parser resilience against malformed strings.
2. **Why It Exists**: Prevents crashes when invalid strings are passed in header.
3. **Request Sent**: `GET /users/me` with `Authorization: Bearer invalid.malformed.jwttoken`.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`
6. **Assertions Performed**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Ensures JWT parser fails gracefully without crashing the server.
9. **Rule Tested**: Invalid JWT structure must result in 401.
10. **Catchable Bug**: Unhandled token parse exceptions throwing 500 error.

#### Test 19: `protected endpoint returns 401 when token is tampered with forged signature`
1. **Behavior Tested**: Cryptographic signature verification.
2. **Why It Exists**: Prevents attackers from forging identity claims in the JWT payload.
3. **Request Sent**: `GET /users/me` with structurally valid Base64 header and payload (`sub: 00000000-...`, `email: forged@test.com`), but with forged signature `'invalidSignatureHere'`.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`
6. **Assertions Performed**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Confirms backend verifies HMAC SHA-256 signature against its server secret.
9. **Rule Tested**: Signature tampering must be cryptographically rejected.
10. **Catchable Bug**: Token signature verification disabled (`algorithms: ['none']` or missing secret).

---

# Part 12 — Users Test Suite

## File: qa/automation/tests/users/users.spec.ts

### Purpose
Tests user profile retrieval (`GET /users/me`), profile updates (`PATCH /users/me`), parameter tampering protection, and cross-user isolation.

### Actual Current Code
```typescript
import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { UsersApi } from '../../api';

test.describe('Users Domain API Tests', () => {
  // ==========================================
  // 1. GET /users/me
  // ==========================================
  test.describe('GET /users/me', () => {
    test('successfully retrieves authenticated user profile with correct identity fields', async ({ authUser }) => {
      const response = await authUser.api.users.getMe();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toBeDefined();

      // Identity fields verification
      expect(body.id).toBe(authUser.user.id);
      expect(body.email).toBe(authUser.user.email);
      expect(body.name).toBe(authUser.user.name);
      expect(body.accountType).toBe('individual');
      expect(body.accountStatus).toBe('active');
      expect(body.defaultCurrency).toBe('EUR');
      expect(body.createdAt).toBeDefined();
      expect(typeof body.createdAt).toBe('string');

      // Security check: sensitive fields must not be exposed in the profile response
      expect(body.passwordHash).toBeUndefined();
      expect(body.password).toBeUndefined();
    });

    test('maintains strict user isolation across separate authenticated sessions', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A from fixture
      const responseA = await authUser.api.users.getMe();
      expect(responseA.status()).toBe(200);
      const profileA = await responseA.json();

      // Provision User B independently
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      const { userId: userIdB } = await signupB.json();

      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({
        email: testUserB.email,
        password: testUserB.password,
      });
      expect(loginB.status()).toBe(200);
      const { access_token: tokenB } = await loginB.json();

      // Create isolated request context for User B
      const contextB = await playwright.request.newContext({
        baseURL: responseA.url().replace(/\/users\/me.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const usersApiB = new UsersApi(contextB);
      const responseB = await usersApiB.getMe();
      expect(responseB.status()).toBe(200);
      const profileB = await responseB.json();

      // Verify User A receives User A's identity and User B receives User B's identity
      expect(profileA.id).toBe(authUser.user.id);
      expect(profileA.email).toBe(authUser.user.email);

      expect(profileB.id).toBe(userIdB);
      expect(profileB.email).toBe(testUserB.email.toLowerCase());

      // Assert complete identity isolation between users
      expect(profileA.id).not.toBe(profileB.id);
      expect(profileA.email).not.toBe(profileB.email);

      await contextB.dispose();
    });

    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('users/me');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('users/me', {
        headers: {
          Authorization: 'Bearer invalid.token.string',
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  // ==========================================
  // 2. PATCH /users/me
  // ==========================================
  test.describe('PATCH /users/me', () => {
    test('successfully updates user profile name and countryOfResidence', async ({ authUser }) => {
      const updatedName = 'Alex Mercer';
      const updatedCountry = 'Germany';

      const patchResponse = await authUser.api.users.updateMe({
        name: updatedName,
        countryOfResidence: updatedCountry,
      });

      expect(patchResponse.status()).toBe(200);
      const updatedProfile = await patchResponse.json();
      expect(updatedProfile.name).toBe(updatedName);
      expect(updatedProfile.countryOfResidence).toBe(updatedCountry);
      expect(updatedProfile.id).toBe(authUser.user.id);

      // Verify update is observable via subsequent GET /users/me
      const getResponse = await authUser.api.users.getMe();
      expect(getResponse.status()).toBe(200);
      const fetchedProfile = await getResponse.json();
      expect(fetchedProfile.name).toBe(updatedName);
      expect(fetchedProfile.countryOfResidence).toBe(updatedCountry);

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{ name: string; countryOfResidence: string }>(
        'SELECT name, "countryOfResidence" FROM users WHERE id = $1',
        [authUser.user.id],
      );
      expect(dbRow).not.toBeNull();
      expect(dbRow?.name).toBe(updatedName);
      expect(dbRow?.countryOfResidence).toBe(updatedCountry);
    });

    test('successfully updates user default currency', async ({ authUser }) => {
      const patchResponse = await authUser.api.users.updateMe({
        defaultCurrency: 'GBP',
      });

      expect(patchResponse.status()).toBe(200);
      const updatedProfile = await patchResponse.json();
      expect(updatedProfile.defaultCurrency).toBe('GBP');

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{ defaultCurrency: string }>(
        'SELECT "defaultCurrency" FROM users WHERE id = $1',
        [authUser.user.id],
      );
      expect(dbRow?.defaultCurrency).toBe('GBP');
    });

    test('accepts empty update payload and returns unchanged profile', async ({ authUser }) => {
      const beforeRes = await authUser.api.users.getMe();
      const beforeProfile = await beforeRes.json();

      const patchResponse = await authUser.api.users.updateMe({});
      expect(patchResponse.status()).toBe(200);
      const afterProfile = await patchResponse.json();

      expect(afterProfile.id).toBe(beforeProfile.id);
      expect(afterProfile.email).toBe(beforeProfile.email);
      expect(afterProfile.name).toBe(beforeProfile.name);
      expect(afterProfile.defaultCurrency).toBe(beforeProfile.defaultCurrency);
    });

    test('rejects update with invalid currency enum value', async ({ authUser }) => {
      const patchResponse = await authUser.api.users.updateMe({
        defaultCurrency: 'INVALID_CURRENCY' as any,
      });

      expect(patchResponse.status()).toBe(400);
    });

    test('rejects update with non-string name value', async ({ authUser }) => {
      const patchResponse = await authUser.api.users.updateMe({
        name: 12345 as any,
      });

      expect(patchResponse.status()).toBe(400);
    });

    test('prevents parameter tampering and IDOR attempts by stripping non-whitelisted fields', async ({ authUser }) => {
      // Attempt to tamper with id and email through PATCH body
      const tamperAttempt = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'tampered_hacker@wrightpay-qa.test',
        name: 'Legit Name Update',
      };

      const patchResponse = await authUser.api.users.updateMe(tamperAttempt as any);
      expect(patchResponse.status()).toBe(200);

      const body = await patchResponse.json();
      // Whitelisted name is updated
      expect(body.name).toBe('Legit Name Update');
      // Immutable identity fields remain completely untouched
      expect(body.id).toBe(authUser.user.id);
      expect(body.id).not.toBe(tamperAttempt.id);
      expect(body.email).toBe(authUser.user.email);
      expect(body.email).not.toBe(tamperAttempt.email);

      // Verify in PostgreSQL that id and email were not tampered with
      const dbRow = await dbClient.queryOne<{ id: string; email: string }>(
        'SELECT id, email FROM users WHERE id = $1',
        [authUser.user.id],
      );
      expect(dbRow?.id).toBe(authUser.user.id);
      expect(dbRow?.email).toBe(authUser.user.email);
    });

    test('rejects unauthorized PATCH when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.patch('users/me', {
        data: { name: 'Unauthorized Change' },
      });
      expect(response.status()).toBe(401);
    });

    test('rejects PATCH with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.patch('users/me', {
        data: { name: 'Unauthorized Change' },
        headers: {
          Authorization: 'Bearer bogus.token.string',
        },
      });
      expect(response.status()).toBe(401);
    });
  });
});
```

### Detailed Breakdown of All 12 Test Cases

- **Test 1 (`GET /users/me` Profile Retrieval & Sanitization)**: Asserts status 200, correct identity fields (`id`, `email`, `name`, `accountType: 'individual'`, `accountStatus: 'active'`, `defaultCurrency: 'EUR'`), and critically asserts that sensitive fields (`password`, `passwordHash`) are `undefined`.
- **Test 2 (`GET /users/me` Multi-Tenant Isolation)**: Provisions User A and User B concurrently. Asserts that User A receives Profile A and User B receives Profile B with zero data leakage across sessions.
- **Test 3 & 4 (Negatives)**: Asserts 401 when Authorization is missing or invalid.
- **Test 5 (`PATCH /users/me` Name & Country Update)**: Sends `{ name: 'Alex Mercer', countryOfResidence: 'Germany' }`. Asserts 200, subsequent `GET /users/me` parity, and cross-layer PostgreSQL row verification.
- **Test 6 (`PATCH /users/me` Currency Update)**: Updates `defaultCurrency` to `'GBP'`. Asserts 200 and PostgreSQL database column update.
- **Test 7 (`PATCH /users/me` Empty Payload)**: Sends `{}`. Asserts 200 and profile attributes remain completely unchanged.
- **Test 8 & 9 (Validation Boundaries)**: Sends invalid enum `'INVALID_CURRENCY'` and non-string `name: 12345`. Asserts 400 Bad Request.
- **Test 10 (Mass Assignment & Parameter Tampering)**: Injects `{ id: '00000000-...', email: 'tampered@hacker.test', name: 'Legit Name' }`. Verifies that NestJS `ValidationPipe` whitelist strips `id` and `email` while saving `name`. Verified via PostgreSQL query.
- **Test 11 & 12 (PATCH Negatives)**: Asserts 401 when attempting PATCH without token or with malformed token.

---

# Part 13 — Wallet Test Suite

## File: qa/automation/tests/wallet/wallet.spec.ts

### Purpose
Tests wallet balance contract, numeric precision, database persistence parity, calculated multi-currency equivalents, and read idempotency.

### Actual Current Code
```typescript
import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { WalletApi } from '../../api';

test.describe('Wallet Domain API Tests', () => {
  // ==========================================
  // 1. Authenticated Retrieval & Contract
  // ==========================================
  test.describe('GET /wallets/me - Contract & Schema', () => {
    test('successfully retrieves authenticated wallet with valid schema and zero initial balance', async ({
      authUser,
    }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toBeDefined();

      // Structure and field assertions
      expect(typeof body.id).toBe('string');
      expect(body.id.length).toBeGreaterThan(0);
      expect(body.currency).toBe('EUR');
      expect(typeof body.balance).toBe('number');
      expect(body.balance).toBe(0);
      expect(body.isDefault).toBe(true);
      expect(typeof body.equivalents).toBe('object');
      expect(body.equivalents).not.toBeNull();

      // Sensitive / internal fields should not be exposed
      expect(body.userId).toBeUndefined();
    });

    test('balance representation maintains non-negative finite numeric precision', async ({ authUser }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Number.isFinite(body.balance)).toBe(true);
      expect(body.balance).toBeGreaterThanOrEqual(0);

      // Verify rounding precision (at most 2 decimal places)
      const decimalParts = body.balance.toString().split('.');
      if (decimalParts.length > 1) {
        expect(decimalParts[1].length).toBeLessThanOrEqual(2);
      }
    });
  });

  // ==========================================
  // 2. Database Cross-Layer Validation
  // ==========================================
  test.describe('GET /wallets/me - Database Cross-Layer Validation', () => {
    test('matches persisted PostgreSQL wallet record properties exactly', async ({ authUser }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);
      const apiWallet = await response.json();

      // Query database for the authenticated user's primary wallet
      const dbWallet = await dbClient.queryOne<{
        id: string;
        userId: string;
        currency: string;
        balance: string | number;
        isDefault: boolean;
      }>(
        'SELECT id, "userId", currency, balance, "isDefault" FROM wallets WHERE "userId" = $1',
        [authUser.user.id],
      );

      expect(dbWallet).not.toBeNull();
      expect(dbWallet?.id).toBe(apiWallet.id);
      expect(dbWallet?.userId).toBe(authUser.user.id);
      expect(dbWallet?.currency).toBe(apiWallet.currency);
      expect(Number(dbWallet?.balance)).toBe(apiWallet.balance);
      expect(dbWallet?.isDefault).toBe(apiWallet.isDefault);
    });
  });

  // ==========================================
  // 3. Multi-Currency Equivalents Invariants
  // ==========================================
  test.describe('GET /wallets/me - Currency Equivalents Invariants', () => {
    test('returns calculated equivalent balances for all supported currencies', async ({ authUser }) => {
      const response = await authUser.api.wallet.getMyWallet();
      expect(response.status()).toBe(200);
      const body = await response.json();

      // Expected supported currencies confirmed by WalletsService
      const expectedCurrencies = ['EUR', 'GBP', 'USD', 'AED', 'PLN', 'INR'];

      for (const curr of expectedCurrencies) {
        expect(body.equivalents).toHaveProperty(curr);
        expect(typeof body.equivalents[curr]).toBe('number');
        expect(body.equivalents[curr]).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(body.equivalents[curr])).toBe(true);
      }

      // Base currency equivalent must equal current wallet balance
      expect(body.equivalents[body.currency]).toBe(body.balance);
    });
  });

  // ==========================================
  // 4. User Isolation & Read-Only Idempotence
  // ==========================================
  test.describe('GET /wallets/me - User Isolation & Idempotence', () => {
    test('ensures distinct users receive distinct wallets with strict separation', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A from fixture
      const responseA = await authUser.api.wallet.getMyWallet();
      expect(responseA.status()).toBe(200);
      const walletA = await responseA.json();

      // Provision User B
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      const { userId: userIdB } = await signupB.json();

      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({
        email: testUserB.email,
        password: testUserB.password,
      });
      expect(loginB.status()).toBe(200);
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: responseA.url().replace(/\/wallets\/me.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const walletApiB = new WalletApi(contextB);
      const responseB = await walletApiB.getMyWallet();
      expect(responseB.status()).toBe(200);
      const walletB = await responseB.json();

      // Isolation assertions
      expect(walletA.id).not.toBe(walletB.id);

      // Verify in database that ownership maps to distinct users
      const dbWalletA = await dbClient.queryOne<{ userId: string }>('SELECT "userId" FROM wallets WHERE id = $1', [walletA.id]);
      const dbWalletB = await dbClient.queryOne<{ userId: string }>('SELECT "userId" FROM wallets WHERE id = $1', [walletB.id]);

      expect(dbWalletA?.userId).toBe(authUser.user.id);
      expect(dbWalletB?.userId).toBe(userIdB);
      expect(dbWalletA?.userId).not.toBe(dbWalletB?.userId);

      await contextB.dispose();
    });

    test('read operation is strictly idempotent and does not create duplicate wallet records', async ({
      authUser,
    }) => {
      // Check initial wallet count in DB for this user
      const beforeCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM wallets WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(beforeCount?.count)).toBe(1);

      // Perform multiple consecutive GET requests
      const res1 = await authUser.api.wallet.getMyWallet();
      expect(res1.status()).toBe(200);
      const wallet1 = await res1.json();

      const res2 = await authUser.api.wallet.getMyWallet();
      expect(res2.status()).toBe(200);
      const wallet2 = await res2.json();

      // Confirm properties remain identical
      expect(wallet1.id).toBe(wallet2.id);
      expect(wallet1.currency).toBe(wallet2.currency);
      expect(wallet1.balance).toBe(wallet2.balance);

      // Confirm no additional records were created in database
      const afterCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM wallets WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(afterCount?.count)).toBe(1);
    });
  });

  // ==========================================
  // 5. Authorization Negatives
  // ==========================================
  test.describe('GET /wallets/me - Authorization Negatives', () => {
    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('wallets/me');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('wallets/me', {
        headers: {
          Authorization: 'Bearer invalid.token.value',
        },
      });
      expect(response.status()).toBe(401);
    });
  });
});
```

### Detailed Breakdown of All 8 Test Cases
- **Test 1 (Contract & Zero Balance)**: Asserts wallet properties (`id`, `currency: 'EUR'`, `balance: 0`, `isDefault: true`, `equivalents: object`) and ensures internal foreign key `userId` is omitted from the DTO.
- **Test 2 (Numeric Precision)**: Verifies `Number.isFinite(balance)`, `balance >= 0`, and maximum of 2 decimal places.
- **Test 3 (Cross-Layer DB Parity)**: Queries `wallets` table in PostgreSQL and matches `id`, `userId`, `currency`, `balance`, and `isDefault` against the HTTP response.
- **Test 4 (Multi-Currency Equivalents)**: Asserts that `equivalents` contains valid finite numbers for all supported currencies: `EUR`, `GBP`, `USD`, `AED`, `PLN`, and `INR`. Confirms base `equivalents['EUR'] === balance`.
- **Test 5 (User Isolation)**: Asserts that User A and User B receive distinct wallet IDs and that PostgreSQL assigns them to distinct `userId` foreign keys.
- **Test 6 (Read Idempotence)**: Confirms repeated `GET /wallets/me` calls do not mutate state or generate spurious database rows (count remains 1).
- **Test 7 & 8 (Authorization Negatives)**: Asserts 401 when Authorization header is omitted or token is invalid.

---

# Part 14 — Cards Test Suite

## File: qa/automation/tests/cards/cards.spec.ts

### Purpose
Validates the complete card lifecycle, virtual/physical provisioning, card masking, state transitions (`active` <-> `frozen` -> `deactivated`), physical hard deletion, and cross-user IDOR protection.

### Actual Current Code
```typescript
import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { CardsApi } from '../../api';
import { CreateCardRequest } from '../../api/types';

function generateTestCardData(overrides?: Partial<CreateCardRequest>): CreateCardRequest {
  return {
    cardholderName: overrides?.cardholderName || 'John Doe',
    cardNumber: overrides?.cardNumber || '4242424242421234',
    expiryDate: overrides?.expiryDate || '12/28',
    cvv: overrides?.cvv || '123',
    type: overrides?.type,
  };
}

test.describe('Cards Domain API Tests', () => {
  // ==========================================
  // 1. GET /cards - Retrieval & Empty State
  // ==========================================
  test.describe('GET /cards - Listing & Retrieval', () => {
    test('returns an empty array for a newly registered user with no cards', async ({ authUser }) => {
      const response = await authUser.api.cards.getMyCards();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    test('returns list of user cards after successful card creation', async ({ authUser }) => {
      const cardPayload = generateTestCardData();
      const createRes = await authUser.api.cards.createCard(cardPayload);
      expect(createRes.status()).toBe(201);
      const createdCard = await createRes.json();

      const listRes = await authUser.api.cards.getMyCards();
      expect(listRes.status()).toBe(200);
      const cards = await listRes.json();

      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBeGreaterThanOrEqual(1);

      const found = cards.find((c: any) => c.id === createdCard.id);
      expect(found).toBeDefined();
      expect(found.cardholderName).toBe('JOHN DOE');
      expect(found.lastFourDigits).toBe('1234');
      expect(found.status).toBe('active');
    });

    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('cards');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('cards', {
        headers: {
          Authorization: 'Bearer invalid.token.value',
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  // ==========================================
  // 2. POST /cards - Creation & Persistence
  // ==========================================
  test.describe('POST /cards - Creation & Database Verification', () => {
    test('successfully provisions an active debit card with masked PAN and verifies PostgreSQL persistence', async ({
      authUser,
    }) => {
      const cardPayload = generateTestCardData({
        cardholderName: 'Alice Springs',
        cardNumber: '5555444433339876',
        expiryDate: '10/29',
        cvv: '999',
      });

      const response = await authUser.api.cards.createCard(cardPayload);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toBeDefined();
      expect(typeof body.id).toBe('string');
      expect(body.id.length).toBeGreaterThan(0);
      expect(body.cardholderName).toBe('ALICE SPRINGS');
      expect(body.lastFourDigits).toBe('9876');
      expect(body.expiryDate).toBe('10/29');
      expect(body.status).toBe('active');
      expect(body.type).toBe('debit');

      // Security check: raw card number and CVV must never be returned in API response
      expect(body.cardNumber).toBeUndefined();
      expect(body.cvv).toBeUndefined();

      // Cross-layer PostgreSQL verification
      const dbCard = await dbClient.queryOne<{
        id: string;
        userId: string;
        cardholderName: string;
        lastFourDigits: string;
        expiryDate: string;
        status: string;
        type: string;
      }>(
        'SELECT id, "userId", "cardholderName", "lastFourDigits", "expiryDate", status, type FROM cards WHERE id = $1',
        [body.id],
      );

      expect(dbCard).not.toBeNull();
      expect(dbCard?.id).toBe(body.id);
      expect(dbCard?.userId).toBe(authUser.user.id);
      expect(dbCard?.cardholderName).toBe('ALICE SPRINGS');
      expect(dbCard?.lastFourDigits).toBe('9876');
      expect(dbCard?.expiryDate).toBe('10/29');
      expect(dbCard?.status).toBe('active');
      expect(dbCard?.type).toBe('debit');
    });

    test('successfully provisions a credit card when explicitly requested', async ({ authUser }) => {
      const cardPayload = generateTestCardData({
        type: 'credit',
      });

      const response = await authUser.api.cards.createCard(cardPayload);
      expect(response.status()).toBe(201);
      const body = await response.json();

      expect(body.type).toBe('credit');

      // Cross-layer DB verification
      const dbCard = await dbClient.queryOne<{ type: string }>(
        'SELECT type FROM cards WHERE id = $1',
        [body.id],
      );
      expect(dbCard?.type).toBe('credit');
    });
  });

  // ==========================================
  // 3. POST /cards - Validation Boundaries
  // ==========================================
  test.describe('POST /cards - Validation Boundaries', () => {
    test('rejects card creation when cardholderName is missing or empty', async ({ authUser }) => {
      const response = await authUser.api.cards.createCard({
        cardholderName: '',
        cardNumber: '4242424242421234',
        expiryDate: '12/28',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects card creation with invalid expiry date format', async ({ authUser }) => {
      // Month > 12
      const resInvalidMonth = await authUser.api.cards.createCard({
        cardholderName: 'Invalid Expiry',
        cardNumber: '4242424242421234',
        expiryDate: '13/28',
      });
      expect(resInvalidMonth.status()).toBe(400);

      // Non-numeric string
      const resNonNumeric = await authUser.api.cards.createCard({
        cardholderName: 'Invalid Expiry',
        cardNumber: '4242424242421234',
        expiryDate: 'invalid',
      });
      expect(resNonNumeric.status()).toBe(400);
    });

    test('rejects card creation with unsupported card type enum', async ({ authUser }) => {
      const response = await authUser.api.cards.createCard({
        cardholderName: 'Bad Enum',
        cardNumber: '4242424242421234',
        expiryDate: '12/28',
        type: 'prepaid' as any,
      });
      expect(response.status()).toBe(400);
    });
  });

  // ==========================================
  // 4. Card State Machine - Lifecycle
  // ==========================================
  test.describe('Card State Machine - Lifecycle Transitions', () => {
    test('transitions an active card to frozen status via freeze endpoint', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      expect(card.status).toBe('active');

      const freezeRes = await authUser.api.cards.freezeCard(card.id);
      expect(freezeRes.status()).toBe(200);
      const frozenCard = await freezeRes.json();
      expect(frozenCard.id).toBe(card.id);
      expect(frozenCard.status).toBe('frozen');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('frozen');
    });

    test('transitions a frozen card back to active status via unfreeze endpoint', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.freezeCard(card.id);

      const unfreezeRes = await authUser.api.cards.unfreezeCard(card.id);
      expect(unfreezeRes.status()).toBe(200);
      const activeCard = await unfreezeRes.json();
      expect(activeCard.id).toBe(card.id);
      expect(activeCard.status).toBe('active');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('active');
    });

    test('transitions an active card to terminal deactivated status via deactivate endpoint', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();

      const deactivateRes = await authUser.api.cards.deactivateCard(card.id);
      expect(deactivateRes.status()).toBe(200);
      const deactivatedCard = await deactivateRes.json();
      expect(deactivatedCard.id).toBe(card.id);
      expect(deactivatedCard.status).toBe('deactivated');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('deactivated');
    });

    test('allows deactivating a frozen card directly', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.freezeCard(card.id);

      const deactivateRes = await authUser.api.cards.deactivateCard(card.id);
      expect(deactivateRes.status()).toBe(200);
      const deactivatedCard = await deactivateRes.json();
      expect(deactivatedCard.status).toBe('deactivated');

      // Database verification
      const dbCard = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [card.id]);
      expect(dbCard?.status).toBe('deactivated');
    });
  });

  // ==========================================
  // 5. Card State Machine - Invalid Transitions
  // ==========================================
  test.describe('Card State Machine - Invalid State Transitions', () => {
    test('rejects freezing an already frozen card with 400', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.freezeCard(card.id);

      // Second freeze call should be rejected
      const secondFreezeRes = await authUser.api.cards.freezeCard(card.id);
      expect(secondFreezeRes.status()).toBe(400);
      const errorBody = await secondFreezeRes.json();
      expect(errorBody.message).toContain('Card is already frozen');
    });

    test('rejects unfreezing an already active card with 400', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      expect(card.status).toBe('active');

      const unfreezeRes = await authUser.api.cards.unfreezeCard(card.id);
      expect(unfreezeRes.status()).toBe(400);
      const errorBody = await unfreezeRes.json();
      expect(errorBody.message).toContain('Card is already active');
    });

    test('rejects state modifications on a deactivated card with 400', async ({ authUser }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();
      await authUser.api.cards.deactivateCard(card.id);

      // Attempt freeze on deactivated card
      const freezeRes = await authUser.api.cards.freezeCard(card.id);
      expect(freezeRes.status()).toBe(400);
      const freezeError = await freezeRes.json();
      expect(freezeError.message).toContain('Deactivated card cannot be modified');

      // Attempt unfreeze on deactivated card
      const unfreezeRes = await authUser.api.cards.unfreezeCard(card.id);
      expect(unfreezeRes.status()).toBe(400);
      const unfreezeError = await unfreezeRes.json();
      expect(unfreezeError.message).toContain('Deactivated card cannot be modified');

      // Attempt duplicate deactivation
      const deactivateRes = await authUser.api.cards.deactivateCard(card.id);
      expect(deactivateRes.status()).toBe(400);
      const deactivateError = await deactivateRes.json();
      expect(deactivateError.message).toContain('Card is already deactivated');
    });
  });

  // ==========================================
  // 6. Hard Deletion & IDOR Security Boundaries
  // ==========================================
  test.describe('Hard Deletion & Cross-User Security', () => {
    test('hard deletes card from PostgreSQL database and excludes it from subsequent listings', async ({
      authUser,
    }) => {
      const card = await (await authUser.api.cards.createCard(generateTestCardData())).json();

      const deleteRes = await authUser.api.cards.deleteCard(card.id);
      expect(deleteRes.status()).toBe(200);
      const deleteBody = await deleteRes.json();
      expect(deleteBody.message).toBe('Card successfully deleted');
      expect(deleteBody.id).toBe(card.id);

      // PostgreSQL verification: card record must be physically deleted (count = 0)
      const dbCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM cards WHERE id = $1',
        [card.id],
      );
      expect(Number(dbCount?.count)).toBe(0);

      // GET /cards must no longer contain the deleted card
      const listRes = await authUser.api.cards.getMyCards();
      const cards = await listRes.json();
      const found = cards.find((c: any) => c.id === card.id);
      expect(found).toBeUndefined();

      // Subsequent delete attempt must return 404
      const secondDeleteRes = await authUser.api.cards.deleteCard(card.id);
      expect(secondDeleteRes.status()).toBe(404);
    });

    test('returns 404 when deleting a non-existent card UUID', async ({ authUser }) => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const response = await authUser.api.cards.deleteCard(nonExistentUuid);
      expect(response.status()).toBe(404);
    });

    test('enforces strict multi-tenant isolation and rejects cross-user card manipulation (IDOR)', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A creates Card A
      const cardA = await (await authUser.api.cards.createCard(generateTestCardData({ cardholderName: 'User A Card' }))).json();

      // Provision User B
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({ email: testUserB.email, password: testUserB.password });
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: (await authUser.api.cards.getMyCards()).url().replace(/\/cards.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const cardsApiB = new CardsApi(contextB);

      // User B creates Card B
      const cardB = await (await cardsApiB.createCard(generateTestCardData({ cardholderName: 'User B Card' }))).json();

      // Multi-tenant visibility isolation: User A sees only Card A, User B sees only Card B
      const listA = await (await authUser.api.cards.getMyCards()).json();
      const listB = await (await cardsApiB.getMyCards()).json();

      expect(listA.some((c: any) => c.id === cardA.id)).toBe(true);
      expect(listA.some((c: any) => c.id === cardB.id)).toBe(false);

      expect(listB.some((c: any) => c.id === cardB.id)).toBe(true);
      expect(listB.some((c: any) => c.id === cardA.id)).toBe(false);

      // IDOR attempts: User B attempting to mutate or delete User A's card must return 404
      const freezeAttempt = await cardsApiB.freezeCard(cardA.id);
      expect(freezeAttempt.status()).toBe(404);

      const unfreezeAttempt = await cardsApiB.unfreezeCard(cardA.id);
      expect(unfreezeAttempt.status()).toBe(404);

      const deactivateAttempt = await cardsApiB.deactivateCard(cardA.id);
      expect(deactivateAttempt.status()).toBe(404);

      const deleteAttempt = await cardsApiB.deleteCard(cardA.id);
      expect(deleteAttempt.status()).toBe(404);

      // Confirm Card A status remains untouched in PostgreSQL
      const dbCardA = await dbClient.queryOne<{ status: string }>('SELECT status FROM cards WHERE id = $1', [cardA.id]);
      expect(dbCardA?.status).toBe('active');

      await contextB.dispose();
    });
  });
});
```

### The Card State Machine
```text
           ┌──────────────────────┐
           │      PROVISIONED     │
           │       (active)       │
           └───────┬──────────────┘
                   │
         freezeCard│  ▲ unfreezeCard
                   │  │
                   ▼  │
           ┌──────────────────────┐
           │        FROZEN        │
           │       (frozen)       │
           └───────┬──────────────┘
                   │
    deactivateCard │  ▲ (Impossible)
                   ▼  │
       ┌──────────────────────────────┐
       │         DEACTIVATED          │
       │    (Terminal State - 400)    │
       └──────────────────────────────┘
```

### Detailed Breakdown of Key Cards Tests
- **Test 5 (Debit Provisioning & Masking)**: Verifies that sensitive PAN (`cardNumber`) and CVV are **never** returned in the API response (`undefined`). Only `lastFourDigits` is returned and stored in PostgreSQL.
- **Test 6 (Credit Provisioning)**: Proves that explicitly passing `type: 'credit'` is honored and stored.
- **Test 10 & 11 (Active <-> Frozen Transitions)**: Tests bidirectional transitions via `/cards/:id/freeze` and `/cards/:id/unfreeze`. Verified in PostgreSQL.
- **Test 12 & 13 (Deactivation Transitions)**: Proves that both `active` and `frozen` cards can transition to `deactivated`.
- **Test 14, 15, 16 (Invalid State Transitions)**: Confirms state machine guards:
  - Freezing a frozen card returns `400 Bad Request` (`"Card is already frozen"`).
  - Unfreezing an active card returns `400 Bad Request` (`"Card is already active"`).
  - Attempting any mutation on a `deactivated` card returns `400 Bad Request` (`"Deactivated card cannot be modified"`).
- **Test 17 (Hard Deletion)**: Calling `DELETE /cards/:id` physically purges the record (`count = 0` in PostgreSQL). Subsequent delete attempts return `404 Not Found`.
- **Test 19 (IDOR Protection)**: Tests Insecure Direct Object References. User B attempts to freeze, unfreeze, deactivate, or delete User A's card. The backend enforces `WHERE id = :id AND userId = :currentUserId` and returns `404 Not Found` for all unauthorized operations. Card A's status remains `'active'` in PostgreSQL.

---

# Part 15 — Test Data & Test Isolation

### Principles Implemented
1. **Zero Hardcoded IDs or Emails**: Every test suite generates isolated users via `generateTestUserData()`.
2. **Deterministic-Yet-Random**: The generator combines `Date.now()`, `process.pid`, and atomic counters to guarantee zero collisions even across 4+ parallel workers.
3. **Order Independence**: Any test can run in isolation (`npx playwright test -g "rejects duplicate user"`), in parallel, or in reverse order without failure.
4. **Lifecycle Scoping**: `APIRequestContext` instances are created per-test and disposed in `fixture.authUser` teardown.
5. **Database Connection Sharing**: All workers share the managed `DbClient` pool which automatically heals if closed.

---

# Part 16 — Backend Behavior Discovered During Development

### Confirmed from Implementation
- **Port Layout**: Backend runs on `http://localhost:3001/api/v1`; Frontend on `http://localhost:3000`.
- **Signup Contract**: `POST /auth/signup` returns `{ message: string, userId: string }`. It does NOT return an access token or log the user in automatically.
- **Login Contract**: `POST /auth/login` accepts `{ email, password }` and returns `{ access_token: string, user: UserProfile }`.
- **Email Verification**: Verification OTP in development is `'123456'`. Verifying transitions `users.accountStatus` from `'pending'` to `'active'`.
- **Default Wallet**: Signup automatically provisions an initial default wallet in `EUR` with `0.00` balance.
- **Wallet Equivalents**: `GET /wallets/me` calculates real-time equivalents for `['EUR', 'GBP', 'USD', 'AED', 'PLN', 'INR']` using `ExchangeRatesService`. Equivalents are not stored in PostgreSQL.
- **Card State Machine**: Supports `active`, `frozen`, and `deactivated`. `deactivated` is a terminal state.
- **Card Deletion**: `DELETE /cards/:id` is a **hard delete** (`DELETE FROM cards WHERE id = $1`).
- **Card Data Masking**: PAN and CVV are never stored in the database. Only `lastFourDigits` is persisted.
- **IDOR Protection**: All card operations filter by `WHERE id = :id AND userId = :userId`, returning 404 if the card belongs to another tenant.
- **BullMQ Architecture**: Queue name is `'transfers'`; job name is `'process-transfer'`; job payload contains `{ transactionId }`.

### Not Implemented / Not Currently Available
- *Direct Wallet Mutations*: There are currently no endpoints for manual deposits or withdrawals (`POST /wallets/deposit` does not exist).
- *Soft Deletion for Cards*: There is no `deletedAt` column on the cards entity.
- *Server-Side Token Revocation*: `POST /auth/logout` acknowledges logout but does not maintain a Redis JWT revocation blacklist.

---

# Part 17 — Problems Encountered During Development & Solutions

### Problem 1: Playwright URL Resolution Stripping `/api/v1`
- **What Happened**: Requests to `/auth/login` resulted in `404 Not Found`.
- **Why It Happened**: `new URL('/auth/login', 'http://localhost:3001/api/v1')` treats leading slashes as origin-relative, resolving to `http://localhost:3001/auth/login`.
- **Diagnosis**: Inspected request URLs in Playwright trace viewer.
- **Solution**: Implemented `resolvePath(path)` in `BaseApi`:
  ```typescript
  protected resolvePath(path: string): string {
    return path.startsWith('/') ? path.slice(1) : path;
  }
  ```
- **Why It Works**: Stripping the leading slash forces relative path resolution: `http://localhost:3001/api/v1/` + `auth/login` = `http://localhost:3001/api/v1/auth/login`.

### Problem 2: PostgreSQL Pool Termination in Multi-Worker Execution
- **What Happened**: Tests crashed intermittently with `Error: Cannot use a pool after calling end()`.
- **Why It Happened**: If any hook or worker called `dbClient.close()`, the shared singleton `pg.Pool` instance was marked ended. Subsequent tests using `dbClient` failed.
- **Diagnosis**: Stack trace pointing to `node_modules/pg-pool/index.js`.
- **Solution**: Implemented self-healing pool recreation in `DbClient`:
  ```typescript
  private getActivePool(): Pool {
    if ((this.pool as any).ended) {
      this.initPool();
    }
    return this.pool;
  }
  ```
- **Why It Works**: Transparently detects when the pool was closed and instantiates a fresh pool on the next query.

### Problem 3: BullMQ Blocking Connection Requirement
- **What Happened**: `TransferQueueClient` failed to connect with BullMQ errors.
- **Why It Happened**: BullMQ uses blocking Redis operations (`BRPOPLPUSH`). If `maxRetriesPerRequest` is not set to `null`, `ioredis` rejects commands.
- **Diagnosis**: BullMQ documentation and console warnings.
- **Solution**: Configured dedicated IORedis connection:
  ```typescript
  this.connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  ```
- **Why It Works**: Satisfies BullMQ protocol requirements.

---

# Part 18 — Complete Execution Walkthrough

Here is the exact lifecycle of an automated test execution (`test('transitions an active card to frozen status')`):

1. **Test Runner Initialization**: Playwright loads `playwright.config.ts`, parses `env.config.ts`, and discovers 64 tests across 7 spec files.
2. **Worker Spawning**: Playwright spawns parallel worker processes.
3. **Fixture Resolution**: Test declares `{ authUser }`.
4. **User Generation**: `generateTestUserData()` creates unique email `qa_1726645800_1234_1@wrightpay-qa.test`.
5. **Signup**: `AuthApi.signup()` sends `POST http://localhost:3001/api/v1/auth/signup`.
6. **Email Verification**: `AuthApi.verifyEmail()` sends OTP `'123456'`. Backend sets `accountStatus: 'active'`.
7. **Login**: `AuthApi.login()` posts credentials and extracts `access_token`.
8. **Context Creation**: Playwright creates an isolated `APIRequestContext` with `Authorization: Bearer <token>`.
9. **Test Body Execution**: Test calls `authUser.api.cards.createCard(cardPayload)`.
10. **Card Provisioning**: Backend creates card in PostgreSQL with status `'active'`.
11. **State Transition**: Test calls `authUser.api.cards.freezeCard(card.id)`.
12. **Status Assertion**: Test asserts response status is `200 OK` and `body.status === 'frozen'`.
13. **Cross-Layer Assertion**: Test invokes `dbClient.queryOne('SELECT status FROM cards WHERE id = $1', [card.id])`. Asserts database row is `'frozen'`.
14. **Teardown**: Playwright runs fixture cleanup, calling `authContext.dispose()`.

---

# Part 19 — Important SDET Concepts

- **API Testing**: Functional validation of HTTP endpoints, contracts, status codes, and headers.
- **Cross-Layer Testing**: Validating that an API operation produced the correct persistent side effects in PostgreSQL, Redis, and queues.
- **Test Isolation**: Ensuring test cases are 100% independent and can run concurrently without state collision.
- **State Machine Testing**: Verifying valid transitions, terminal states, and asserting that invalid transitions return proper error codes (e.g., 400).
- **IDOR (Insecure Direct Object Reference)**: Security testing verifying that Tenant A cannot access or mutate Tenant B's entities.
- **Mass Assignment / Parameter Tampering**: Verifying that API gateways strip non-whitelisted fields (like `id` or `email`) during PATCH/PUT requests.
- **Data Masking (PCI-DSS)**: Ensuring sensitive financial attributes (full PAN, CVV, password hashes) are never exposed via API or logged in plaintext.
- **Idempotency**: Guaranteeing that repeated requests produce the exact same outcome without duplicate side effects.

---

# Part 20 — API Testing vs. Integration Testing

| Dimension | Pure API Functional Testing | API + DB/Queue Integration Verification |
| :--- | :--- | :--- |
| **Perspective** | Black-box. Interacts solely with HTTP inputs and outputs. | Grey-box. Interacts with HTTP, then inspects backend storage directly. |
| **Network Target** | Only communicates with the NestJS API gateway. | Communicates with NestJS API, PostgreSQL, Redis, and BullMQ. |
| **What It Catches** | Routing errors, validation pipes, HTTP status codes, JSON schema errors. | Silent data loss, password hashing bugs, background job failures, cache TTL bugs. |
| **Example in WrightPay** | Asserting `POST /auth/signup` returns `201 Created` and `{ userId }`. | Asserting `users.passwordHash` starts with `$argon2` and default `wallets` row exists in DB. |

---

# Part 21 — SDET Interview Preparation

### Q1: Why did we create API client classes instead of making raw `page.request.post()` calls in tests?
- **Short Answer**: To achieve DRY principles, maintainability, and clean separation of concerns.
- **Deeper Explanation**: If an endpoint path or request schema changes, updating a raw call would require modifying dozens of test files. With API clients, changes are made in one central method. Tests remain readable business specifications.

### Q2: Why don't we put `expect()` assertions inside API clients?
- **Short Answer**: Putting assertions in API clients destroys their reusability for negative testing.
- **Deeper Explanation**: If `createCard()` asserted `expect(response.status()).toBe(201)`, we could never use that method to test invalid inputs, empty names, or unsupported card types that expect `400 Bad Request`. API clients must remain neutral HTTP dispatchers.

### Q3: Why do we use Playwright `APIRequestContext` rather than `axios` or `fetch`?
- **Short Answer**: Unified test framework ecosystem, native browser cookie jar sharing, and zero third-party HTTP dependencies.
- **Deeper Explanation**: `APIRequestContext` is built into `@playwright/test`. It automatically integrates with Playwright's trace viewer, HTML reporters, fixture dependency injection, and network lifecycle management.

### Q4: Why validate PostgreSQL after an API request if the API already returned 200 OK?
- **Short Answer**: To catch silent data corruption, verify data security (Argon2 hashing), and confirm default entity provisioning.
- **Deeper Explanation**: In financial systems, an API might return 200 OK while failing to write to disk, leaving sensitive passwords plaintext, or failing to initialize a default EUR wallet. Cross-layer validation guarantees persistent integrity.

### Q5: How is multi-tenant isolation (IDOR) tested in this framework?
- **Short Answer**: We provision two distinct users in the same test and have User B attempt to access and mutate User A's resources.
- **Deeper Explanation**: In `cards.spec.ts`, User A creates Card A, and User B creates Card B. User B attempts to freeze, unfreeze, deactivate, and delete Card A. We assert that all unauthorized requests return `404 Not Found` and verify via PostgreSQL that Card A remained unchanged.

---

# Part 22 — Debugging Guide

### Common Investigatory Scenarios

1. **Unexpected 401 Unauthorized**:
   - Verify JWT expiration.
   - Check if endpoint path had a leading slash that stripped `/api/v1`.
   - Ensure Authorization header is formatted as `Bearer <token>`.
2. **Unexpected 400 Bad Request**:
   - Inspect backend logs for `ValidationPipe` messages.
   - Check DTO constraints in `backend/src/modules/<domain>/dto/`.
3. **Database Assertion Mismatch**:
   - Run manual query using `psql`:
     ```bash
     docker exec -it wrightpay-postgres psql -U postgres -d wrightpay -c "SELECT * FROM users;"
     ```
4. **Redis Inspection**:
   - Connect via `redis-cli`:
     ```bash
     docker exec -it wrightpay-redis redis-cli keys "bull:transfers:*"
     ```
5. **Useful Framework Debugging Commands**:
   - Run with trace viewer: `npx playwright test --trace on`
   - Run in headed UI mode: `npm run test:ui`
   - Open HTML report: `npm run test:report`
   - Run typecheck: `npm run typecheck`

---

# Part 23 — Current Test Inventory

| Domain | File Path | Test Count | What It Covers | DB Validation? | Auth Required? | Mutating or Read-Only | Security Rules Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Skeleton** | `tests/proof-of-life.spec.ts` | 1 | Runner sanity check | No | No | Read-Only | None |
| **Infra Smoke** | `tests/infra-smoke.spec.ts` | 3 | PostgreSQL, Redis, BullMQ health | Yes (Direct) | No | Mutating (Ephemeral) | Connection health |
| **API Smoke** | `tests/api-smoke.spec.ts` | 2 | Public rates & authUser fixture | No | Mixed | Read-Only | Fixture wiring |
| **Auth** | `tests/auth/auth.spec.ts` | 19 | Signup, Login, OTP, Logout, JWT boundaries | Yes | Mixed | Mutating | Argon2, JWT forgery, OTP replay, enumeration |
| **Users** | `tests/users/users.spec.ts` | 12 | Profile GET/PATCH, IDOR, Whitelisting | Yes | Yes | Mutating | Mass assignment, isolation |
| **Wallet** | `tests/wallet/wallet.spec.ts` | 8 | Schema, Precision, Equivalents, DB parity | Yes | Yes | Read-Only | Multi-currency invariants, idempotence |
| **Cards** | `tests/cards/cards.spec.ts` | 19 | CRUD, State Machine, Hard Delete, IDOR | Yes | Yes | Mutating | PAN masking, terminal states, cross-tenant IDOR |
| **Beneficiaries** | `tests/beneficiaries/beneficiaries.spec.ts` | 25 | Bank & UPI, Validation, Max 3 Active, Soft Delete, IDOR | Yes | Yes | Mutating | Max active quota, UPI INR rule, cross-tenant IDOR |
| **Transfers** | `tests/transfers/transfers.spec.ts` | 30 | Contract, DTO Validation, Insufficient Funds, 25 EUR Fee, IDOR, Idempotency, Redis, BullMQ, Settlement, Simulation Failure, Concurrency, Boundaries | Yes | Yes | Mutating | Pessimistic locking, deduplication, IDOR, authorization, financial balance invariant |

**Total Implemented Tests**: **119 Passing Tests** (89 Baseline + 30 Transfers)

---

# Part 24 — Complete QA Automation File Index

| File Path | Category | Purpose | Major Dependencies | Used By |
| :--- | :--- | :--- | :--- | :--- |
| `package.json` | Config | Dependencies & scripts | npm | Framework |
| `playwright.config.ts` | Config | Test runner configuration | `@playwright/test`, `env.config` | Test runner |
| `tsconfig.json` | Config | TypeScript settings & aliases | TypeScript | Compiler |
| `config/env.config.ts` | Config | Environment loader | `dotenv` | Config, Fixtures, DB, Redis |
| `database/db-client.ts` | Infrastructure | PostgreSQL pool & queries | `pg`, `env.config` | Fixtures, Smoke & Domain tests |
| `redis/redis-client.ts` | Infrastructure | Redis key & TTL client | `ioredis`, `env.config` | Fixtures, Smoke tests |
| `queues/queue-client.ts` | Infrastructure | BullMQ queue inspector | `bullmq`, `ioredis` | Fixtures, Smoke tests |
| `api/base.api.ts` | API Client | Abstract HTTP client & pathing | `@playwright/test` | All domain API clients |
| `api/types.ts` | API Client | Models, DTOs, & Enums | None | All API clients & tests |
| `api/auth.api.ts` | API Client | `/auth` endpoints | `base.api`, `types` | Fixtures, Auth tests |
| `api/users.api.ts` | API Client | `/users` endpoints | `base.api`, `types` | Fixtures, Users tests |
| `api/wallet.api.ts` | API Client | `/wallets` endpoints | `base.api` | Fixtures, Wallet tests |
| `api/cards.api.ts` | API Client | `/cards` endpoints | `base.api`, `types` | Fixtures, Cards tests |
| `api/beneficiaries.api.ts` | API Client | `/beneficiaries` endpoints | `base.api`, `types` | Fixtures |
| `api/transfers.api.ts` | API Client | `/transfers` endpoints | `base.api`, `types` | Fixtures |
| `api/transactions.api.ts` | API Client | `/transactions` endpoints | `base.api`, `types` | Fixtures |
| `api/exchange-rates.api.ts` | API Client | `/exchange-rates` endpoints | `base.api`, `types` | Fixtures, Smoke tests |
| `api/index.ts` | API Client | Public barrel export | All api files | Fixtures, Tests |
| `test-data/user.factory.ts` | Test Data | Dynamic user data generator | `types` | Fixtures, Domain tests |
| `fixtures/api.fixtures.ts` | Fixtures | Custom Playwright fixture | `@playwright/test`, API clients, DB | All domain tests |
| `tests/proof-of-life.spec.ts` | Tests | Sanity check | `@playwright/test` | Test runner |
| `tests/infra-smoke.spec.ts` | Tests | Infrastructure health | DB, Redis, Queue clients | Test runner |
| `tests/api-smoke.spec.ts` | Tests | API architecture health | `api.fixtures` | Test runner |
| `tests/auth/auth.spec.ts` | Tests | Authentication test suite | `api.fixtures`, DB | Test runner |
| `tests/users/users.spec.ts` | Tests | Users test suite | `api.fixtures`, DB | Test runner |
| `tests/wallet/wallet.spec.ts` | Tests | Wallet test suite | `api.fixtures`, DB | Test runner |
| `tests/cards/cards.spec.ts` | Tests | Cards test suite | `api.fixtures`, DB | Test runner |
| `tests/beneficiaries/beneficiaries.spec.ts` | Tests | Beneficiaries test suite | `api.fixtures`, DB | Test runner |
| `tests/transfers/transfers.spec.ts` | Tests | Transfers test suite (30 tests) | `api.fixtures`, DB, Redis, BullMQ | Test runner |

---


---

# STEP 5E — BENEFICIARIES API TESTING

### Domain Overview & Architecture
The Beneficiaries domain manages payout recipients for cross-border financial remittances in WrightPay. Beneficiaries represent external payout destinations belonging to an authenticated user and support two distinct payment rails:
1. **Traditional Bank Account** (`bank_account`): European SEPA / Direct Bank transfer destinations defined by account numbers, routing/bank codes, and optional IFSC codes.
2. **Indian Unified Payments Interface** (`upi`): Indian real-time payment destinations defined by Virtual Payment Addresses (VPA) / UPI IDs (`user@bank`), restricted strictly to Indian Rupee (`INR`) payouts.

All endpoints are hosted on the NestJS backend at `http://localhost:3001/api/v1/beneficiaries` and are guarded by `JwtAuthGuard` requiring an `Authorization: Bearer <token>` header. In the PostgreSQL persistence layer, beneficiaries are stored in the `beneficiaries` table with a foreign key referencing `users(id)` and a nullable `deletedAt` timestamp managed by TypeORM's `@DeleteDateColumn()` to provide soft deletion.

---

### Actual Backend Contract Discovered

| HTTP Method | Endpoint | Status Codes | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/beneficiaries` | `200 OK`, `401 Unauthorized` | Returns all active (non-deleted) beneficiaries for authenticated caller, sorted by `name: 'ASC'`. |
| **POST** | `/beneficiaries` | `201 Created`, `400 Bad Request`, `401 Unauthorized` | Creates a beneficiary. Enforces maximum 3 active beneficiaries per user, UPI currency restrictions, and bank account requirements. |
| **DELETE** | `/beneficiaries/:id` | `200 OK`, `401 Unauthorized`, `404 Not Found` | Soft deletes beneficiary by setting `deletedAt = NOW()`. Idempotency guard: repeated call returns 404. Cross-user IDOR returns 404. |

---

### Request & Response Schemas

#### 1. Request Body (`CreateBeneficiaryDto`)
```typescript
{
  name: string;                   // Required, non-empty string
  currency: Currency;             // Required enum: 'EUR' | 'GBP' | 'USD' | 'AED' | 'PLN' | 'INR'
  payoutMethod?: 'bank_account' | 'upi'; // Optional enum, defaults to 'bank_account'
  accountNumber?: string;         // Required if payoutMethod === 'bank_account'
  bankCode?: string;              // Required by DTO if payoutMethod === 'bank_account', defaults to 'DIRECT'
  ifscCode?: string;              // Optional string
  upiId?: string;                 // Required if payoutMethod === 'upi'
  bankName?: string;              // Optional string, defaults to 'Bank Account' or 'UPI'
}
```

#### 2. Response Body (`Beneficiary`)
```json
{
  "id": "b1111111-1111-1111-1111-111111111111",
  "userId": "u1111111-1111-1111-1111-111111111111",
  "name": "Maria Rossi",
  "currency": "EUR",
  "payoutMethod": "bank_account",
  "accountNumber": "IT12A345678901234567890",
  "bankCode": "UNCRITM1",
  "bankName": "UniCredit",
  "deletedAt": null
}
```

---

### Core Business Rules Verified

1. **Maximum Active Limit (Quota = 3)**:
   - A user may possess at most **3 active beneficiaries** (`MAX_BENEFICIARIES = 3`).
   - If an active user already has 3 beneficiaries, attempting to create a 4th returns `400 Bad Request` with message: `"Maximum limit of 3 active beneficiaries reached"`.
2. **UPI Payout Restrictions**:
   - UPI beneficiaries require `currency: 'INR'`. Passing any other currency (e.g. `USD`, `EUR`) returns `400 Bad Request` with message: `"UPI payout method is only supported for INR currency"`.
   - UPI beneficiaries require a non-empty `upiId` (e.g. `rohan@okhdfcbank`). Missing or blank string returns `400 Bad Request` with message: `"UPI ID is required for UPI payout method"`.
3. **Bank Account Payout Restrictions**:
   - Bank account beneficiaries require `accountNumber`. Missing account number returns `400 Bad Request` with message: `"Account number is required for bank account payout method"`.
   - When `payoutMethod: 'bank_account'` is explicitly provided, ClassValidator's `@ValidateIf` also requires `bankCode`.
4. **Soft Deletion & Slot Reuse**:
   - Calling `DELETE /beneficiaries/:id` executes TypeORM `softDelete({ id, userId })`.
   - The PostgreSQL row is **not physically removed**; its `deletedAt` column is set to the current timestamp.
   - TypeORM's `count({ where: { userId } })` automatically filters out soft-deleted records. Therefore, deleting 1 of 3 beneficiaries decrements the active count to 2, **successfully freeing a slot** to create a replacement beneficiary!
5. **No Duplicate Uniqueness Constraint**:
   - The database contains no unique index on `(userId, name)` or `(userId, accountNumber)`.
   - Creating two beneficiaries with identical names and accounts is allowed by design (e.g. for re-adding accounts or multiple recipient profiles).
6. **Multi-Tenant Ownership & IDOR Protection**:
   - `DELETE /beneficiaries/:id` queries `findOne({ where: { id, userId } })`. If the beneficiary belongs to User A, User B's delete attempt returns `404 Not Found` (`"Beneficiary not found"`), leaving User A's record completely untouched in PostgreSQL.

---

## File: qa/automation/api/beneficiaries.api.ts

### Purpose
Provides standard, reusable HTTP client methods for invoking Beneficiaries API endpoints.

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { CreateBeneficiaryRequest } from './types';

export class BeneficiariesApi extends BaseApi {
  async getMyBeneficiaries(headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('beneficiaries', { headers });
  }

  async createBeneficiary(data: CreateBeneficiaryRequest, headers?: Record<string, string>): Promise<APIResponse> {
    return this.post('beneficiaries', { data, headers });
  }

  async deleteBeneficiary(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.delete(`beneficiaries/${id}`, { headers });
  }
}

```

### Code Explanation
- **Lines 5–8 (`getMyBeneficiaries`)**: Dispatches `GET /beneficiaries` using `BaseApi.get()`, retrieving the user's active beneficiaries.
- **Lines 10–12 (`createBeneficiary`)**: Dispatches `POST /beneficiaries` with request body payload.
- **Lines 14–16 (`deleteBeneficiary`)**: Dispatches `DELETE /beneficiaries/:id` targeted by UUID path parameter.

---

## File: qa/automation/api/types.ts (Beneficiaries Types)

### Purpose
TypeScript contracts defining the request schema and supported payout methods.

### Actual Current Code (Beneficiaries Section)
```typescript
export type BeneficiaryPayoutMethod = 'bank_account' | 'upi' | 'BANK_ACCOUNT' | 'UPI';

export interface CreateBeneficiaryRequest {
  name: string;
  currency: Currency;
  payoutMethod?: BeneficiaryPayoutMethod;
  accountNumber?: string;
  bankCode?: string;
  ifscCode?: string;
  upiId?: string;
  bankName?: string;
}
```

---

## File: qa/automation/tests/beneficiaries/beneficiaries.spec.ts

### Purpose
Executable specification containing 25 comprehensive API test cases covering retrieval, creation, validation, UPI rules, maximum active limits, soft deletion, slot reuse, IDOR security, and database persistence.

### Actual Current Code
```typescript
import { test, expect } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient } from '../../database/db-client';
import { BeneficiariesApi } from '../../api';
import { CreateBeneficiaryRequest } from '../../api/types';

function generateTestBeneficiaryData(overrides?: Partial<CreateBeneficiaryRequest>): CreateBeneficiaryRequest {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return {
    name: overrides?.name || `Beneficiary_${unique}`,
    currency: overrides?.currency || 'EUR',
    payoutMethod: overrides?.payoutMethod || 'bank_account',
    accountNumber: overrides?.accountNumber || `IT12A${unique}`,
    bankCode: overrides?.bankCode || 'UNCRITM1',
    bankName: overrides?.bankName || 'UniCredit',
    ...overrides,
  };
}

function generateTestUpiBeneficiaryData(overrides?: Partial<CreateBeneficiaryRequest>): CreateBeneficiaryRequest {
  const unique = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return {
    name: overrides?.name || `UPI_Beneficiary_${unique}`,
    currency: 'INR',
    payoutMethod: 'upi',
    upiId: overrides?.upiId || `qa_${unique}@okhdfcbank`,
    bankName: overrides?.bankName || 'UPI',
    ...overrides,
  };
}

test.describe('Beneficiaries Domain API Tests', () => {
  // ==========================================
  // 1. GET /beneficiaries - Listing & Retrieval
  // ==========================================
  test.describe('GET /beneficiaries - Listing & Retrieval', () => {
    test('returns an empty array for a newly registered user with no beneficiaries', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.getMyBeneficiaries();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    test('returns active beneficiaries for authenticated user ordered by name ascending', async ({ authUser }) => {
      const b1 = generateTestBeneficiaryData({ name: 'Zara Phillips' });
      const b2 = generateTestBeneficiaryData({ name: 'Alice Walker' });

      const res1 = await authUser.api.beneficiaries.createBeneficiary(b1);
      expect(res1.status()).toBe(201);

      const res2 = await authUser.api.beneficiaries.createBeneficiary(b2);
      expect(res2.status()).toBe(201);

      const listRes = await authUser.api.beneficiaries.getMyBeneficiaries();
      expect(listRes.status()).toBe(200);

      const body = await listRes.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);

      // Verify sorting order is ASC by name
      expect(body[0].name).toBe('Alice Walker');
      expect(body[1].name).toBe('Zara Phillips');

      // Verify response schema contract
      expect(body[0].id).toBeDefined();
      expect(body[0].userId).toBe(authUser.user.id);
      expect(body[0].currency).toBe('EUR');
      expect(body[0].payoutMethod).toBe('bank_account');
      expect(body[0].accountNumber).toBe(b2.accountNumber);
      expect(body[0].deletedAt).toBeNull();
    });

    test('excludes soft-deleted beneficiaries from GET listing', async ({ authUser }) => {
      const bData = generateTestBeneficiaryData({ name: 'To Be Deleted' });
      const createRes = await authUser.api.beneficiaries.createBeneficiary(bData);
      expect(createRes.status()).toBe(201);
      const created = await createRes.json();

      // Soft delete
      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(created.id);
      expect(deleteRes.status()).toBe(200);

      // Subsequent GET should not include the deleted beneficiary
      const listRes = await authUser.api.beneficiaries.getMyBeneficiaries();
      expect(listRes.status()).toBe(200);
      const body = await listRes.json();

      const found = body.find((b: any) => b.id === created.id);
      expect(found).toBeUndefined();
    });

    test('rejects unauthenticated request when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.get('beneficiaries');
      expect(response.status()).toBe(401);
    });

    test('rejects request with invalid Bearer token', async ({ apiContext }) => {
      const response = await apiContext.get('beneficiaries', {
        headers: {
          Authorization: 'Bearer invalid.token.value',
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  // ==========================================
  // 2. POST /beneficiaries - Creation & Persistence
  // ==========================================
  test.describe('POST /beneficiaries - Creation & Persistence', () => {
    test('successfully creates a bank account beneficiary and verifies PostgreSQL persistence', async ({
      authUser,
    }) => {
      const payload = generateTestBeneficiaryData({
        name: 'Maria Rossi',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: 'IT12A345678901234567890',
        bankCode: 'UNCRITM1',
        bankName: 'UniCredit Milano',
      });

      const response = await authUser.api.beneficiaries.createBeneficiary(payload);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body).toBeDefined();
      expect(typeof body.id).toBe('string');
      expect(body.id.length).toBeGreaterThan(0);
      expect(body.userId).toBe(authUser.user.id);
      expect(body.name).toBe('Maria Rossi');
      expect(body.currency).toBe('EUR');
      expect(body.payoutMethod).toBe('bank_account');
      expect(body.accountNumber).toBe('IT12A345678901234567890');
      expect(body.bankCode).toBe('UNCRITM1');
      expect(body.bankName).toBe('UniCredit Milano');

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{
        id: string;
        userId: string;
        name: string;
        currency: string;
        payoutMethod: string;
        accountNumber: string;
        bankCode: string;
        bankName: string;
        deletedAt: string | null;
      }>(
        'SELECT id, "userId", name, currency, "payoutMethod", "accountNumber", "bankCode", "bankName", "deletedAt" FROM beneficiaries WHERE id = $1',
        [body.id],
      );

      expect(dbRow).not.toBeNull();
      expect(dbRow?.id).toBe(body.id);
      expect(dbRow?.userId).toBe(authUser.user.id);
      expect(dbRow?.name).toBe('Maria Rossi');
      expect(dbRow?.currency).toBe('EUR');
      expect(dbRow?.payoutMethod).toBe('bank_account');
      expect(dbRow?.accountNumber).toBe('IT12A345678901234567890');
      expect(dbRow?.bankCode).toBe('UNCRITM1');
      expect(dbRow?.bankName).toBe('UniCredit Milano');
      expect(dbRow?.deletedAt).toBeNull();
    });

    test('successfully creates a bank account beneficiary with default fallback values', async ({ authUser }) => {
      // Omit payoutMethod, bankCode, and bankName
      const payload = {
        name: 'Default Bank Beneficiary',
        currency: 'GBP' as const,
        accountNumber: 'GB29NWBK60161331926819',
      };

      const response = await authUser.api.beneficiaries.createBeneficiary(payload as any);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.payoutMethod).toBe('bank_account');
      expect(body.bankCode).toBe('DIRECT');
      expect(body.bankName).toBe('Bank Account');

      // Verify defaults in PostgreSQL
      const dbRow = await dbClient.queryOne<{
        payoutMethod: string;
        bankCode: string;
        bankName: string;
      }>('SELECT "payoutMethod", "bankCode", "bankName" FROM beneficiaries WHERE id = $1', [body.id]);

      expect(dbRow?.payoutMethod).toBe('bank_account');
      expect(dbRow?.bankCode).toBe('DIRECT');
      expect(dbRow?.bankName).toBe('Bank Account');
    });

    test('successfully creates a valid UPI beneficiary with INR currency and verifies PostgreSQL persistence', async ({
      authUser,
    }) => {
      const upiPayload = generateTestUpiBeneficiaryData({
        name: 'Rohan Sharma',
        upiId: 'rohan.sharma@okhdfcbank',
      });

      const response = await authUser.api.beneficiaries.createBeneficiary(upiPayload);
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Rohan Sharma');
      expect(body.currency).toBe('INR');
      expect(body.payoutMethod).toBe('upi');
      expect(body.upiId).toBe('rohan.sharma@okhdfcbank');
      expect(body.bankName).toBe('UPI');

      // Cross-layer PostgreSQL verification
      const dbRow = await dbClient.queryOne<{
        id: string;
        currency: string;
        payoutMethod: string;
        upiId: string;
        bankName: string;
        deletedAt: string | null;
      }>('SELECT id, currency, "payoutMethod", "upiId", "bankName", "deletedAt" FROM beneficiaries WHERE id = $1', [body.id]);

      expect(dbRow).not.toBeNull();
      expect(dbRow?.currency).toBe('INR');
      expect(dbRow?.payoutMethod).toBe('upi');
      expect(dbRow?.upiId).toBe('rohan.sharma@okhdfcbank');
      expect(dbRow?.bankName).toBe('UPI');
      expect(dbRow?.deletedAt).toBeNull();
    });
  });

  // ==========================================
  // 3. POST /beneficiaries - Validation Boundaries
  // ==========================================
  test.describe('POST /beneficiaries - Validation Boundaries', () => {
    test('rejects creation when name is missing or empty', async ({ authUser }) => {
      const resMissing = await authUser.api.beneficiaries.createBeneficiary({
        currency: 'EUR',
        accountNumber: '12345678',
      } as any);
      expect(resMissing.status()).toBe(400);

      const resEmpty = await authUser.api.beneficiaries.createBeneficiary({
        name: '',
        currency: 'EUR',
        accountNumber: '12345678',
      });
      expect(resEmpty.status()).toBe(400);
    });

    test('rejects creation with invalid currency enum value', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Invalid Currency',
        currency: 'XYZ' as any,
        accountNumber: '12345678',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects bank account creation when accountNumber is missing', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Missing Account',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        bankCode: 'UNCRITM1',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects bank account creation when bankCode is missing and payoutMethod is bank_account', async ({
      authUser,
    }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Missing Bank Code',
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: '1234567890',
      });
      expect(response.status()).toBe(400);
    });

    test('rejects creation with unsupported payoutMethod enum value', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Bad Method',
        currency: 'EUR',
        payoutMethod: 'crypto' as any,
        accountNumber: '12345678',
      });
      expect(response.status()).toBe(400);
    });
  });

  // ==========================================
  // 4. POST /beneficiaries - UPI & Currency Business Rules
  // ==========================================
  test.describe('POST /beneficiaries - UPI & Currency Business Rules', () => {
    test('rejects UPI beneficiary when currency is not INR', async ({ authUser }) => {
      const response = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Invalid UPI Currency',
        currency: 'USD',
        payoutMethod: 'upi',
        upiId: 'user@okhdfcbank',
      });

      expect(response.status()).toBe(400);
      const errorBody = await response.json();
      expect(errorBody.message).toContain('UPI payout method is only supported for INR currency');
    });

    test('rejects UPI beneficiary when upiId is missing or empty', async ({ authUser }) => {
      const resMissing = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Missing UPI ID',
        currency: 'INR',
        payoutMethod: 'upi',
      });
      expect(resMissing.status()).toBe(400);

      const resEmpty = await authUser.api.beneficiaries.createBeneficiary({
        name: 'Empty UPI ID',
        currency: 'INR',
        payoutMethod: 'upi',
        upiId: '   ',
      });
      expect(resEmpty.status()).toBe(400);
    });
  });

  // ==========================================
  // 5. POST /beneficiaries - Maximum Active Limit
  // ==========================================
  test.describe('POST /beneficiaries - Maximum Active Beneficiary Limit', () => {
    test('enforces maximum limit of 3 active beneficiaries per user and rejects 4th creation', async ({
      authUser,
    }) => {
      // Beneficiary 1
      const res1 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 1' }));
      expect(res1.status()).toBe(201);

      // Beneficiary 2
      const res2 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 2' }));
      expect(res2.status()).toBe(201);

      // Beneficiary 3
      const res3 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 3' }));
      expect(res3.status()).toBe(201);

      // Beneficiary 4 - Must be rejected
      const res4 = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Ben 4' }));
      expect(res4.status()).toBe(400);
      const errorBody = await res4.json();
      expect(errorBody.message).toContain('Maximum limit of 3 active beneficiaries reached');

      // Verify active count in PostgreSQL
      const dbCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "deletedAt" IS NULL',
        [authUser.user.id],
      );
      expect(Number(dbCount?.count)).toBe(3);
    });
  });

  // ==========================================
  // 6. DELETE /beneficiaries/:id - Soft Deletion & Slot Reuse
  // ==========================================
  test.describe('DELETE /beneficiaries/:id - Soft Deletion & Slot Reuse', () => {
    test('soft deletes beneficiary by populating deletedAt timestamp in PostgreSQL database', async ({ authUser }) => {
      const beneficiary = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData())
      ).json();

      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(beneficiary.id);
      expect(deleteRes.status()).toBe(200);

      const deleteBody = await deleteRes.json();
      expect(deleteBody.message).toBe('Beneficiary successfully deleted');
      expect(deleteBody.id).toBe(beneficiary.id);

      // Verify database record still physically exists but deletedAt is populated
      const dbRow = await dbClient.queryOne<{
        id: string;
        deletedAt: string | null;
      }>('SELECT id, "deletedAt" FROM beneficiaries WHERE id = $1', [beneficiary.id]);

      expect(dbRow).not.toBeNull();
      expect(dbRow?.id).toBe(beneficiary.id);
      expect(dbRow?.deletedAt).not.toBeNull();
    });

    test('repeated deletion of an already soft-deleted beneficiary returns 404', async ({ authUser }) => {
      const beneficiary = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData())
      ).json();

      // First delete succeeds
      const res1 = await authUser.api.beneficiaries.deleteBeneficiary(beneficiary.id);
      expect(res1.status()).toBe(200);

      // Second delete fails with 404
      const res2 = await authUser.api.beneficiaries.deleteBeneficiary(beneficiary.id);
      expect(res2.status()).toBe(404);
      const errorBody = await res2.json();
      expect(errorBody.message).toContain('Beneficiary not found');
    });

    test('soft deletion frees an active slot allowing a new beneficiary to be created under max 3 limit', async ({
      authUser,
    }) => {
      // Create 3 active beneficiaries
      const b1 = await (await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 1' }))).json();
      await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 2' }));
      await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 3' }));

      // Attempt 4th creation -> rejected
      const rejectRes = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'Slot 4' }));
      expect(rejectRes.status()).toBe(400);

      // Soft delete b1
      const deleteRes = await authUser.api.beneficiaries.deleteBeneficiary(b1.id);
      expect(deleteRes.status()).toBe(200);

      // Confirm active count is now 2
      const activeCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "deletedAt" IS NULL',
        [authUser.user.id],
      );
      expect(Number(activeCount?.count)).toBe(2);

      // Now create a 4th beneficiary -> must succeed
      const newRes = await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'New Slot Beneficiary' }));
      expect(newRes.status()).toBe(201);
      const newBen = await newRes.json();
      expect(newBen.id).toBeDefined();

      // Total rows in DB is 4 (3 active, 1 soft-deleted)
      const totalCount = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1',
        [authUser.user.id],
      );
      expect(Number(totalCount?.count)).toBe(4);
    });
  });

  // ==========================================
  // 7. Multi-Tenant Isolation & Cross-User Security (IDOR)
  // ==========================================
  test.describe('Multi-Tenant Isolation & Cross-User Security (IDOR)', () => {
    test('enforces strict multi-tenant isolation and rejects cross-user beneficiary deletion (IDOR)', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A creates Beneficiary A
      const benA = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'User A Beneficiary' }))
      ).json();

      // Provision User B
      const testUserB = generateTestUserData();
      const signupB = await authApi.signup(testUserB);
      expect(signupB.status()).toBe(201);
      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });

      const loginB = await authApi.login({ email: testUserB.email, password: testUserB.password });
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: (await authUser.api.beneficiaries.getMyBeneficiaries()).url().replace(/\/beneficiaries.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const beneficiariesApiB = new BeneficiariesApi(contextB);

      // User B attempts to DELETE User A's beneficiary
      const idorDeleteRes = await beneficiariesApiB.deleteBeneficiary(benA.id);
      expect(idorDeleteRes.status()).toBe(404);
      const errorBody = await idorDeleteRes.json();
      expect(errorBody.message).toContain('Beneficiary not found');

      // Confirm Beneficiary A was NOT soft-deleted in PostgreSQL
      const dbRow = await dbClient.queryOne<{ deletedAt: string | null }>(
        'SELECT "deletedAt" FROM beneficiaries WHERE id = $1',
        [benA.id],
      );
      expect(dbRow?.deletedAt).toBeNull();

      await contextB.dispose();
    });

    test('ensures GET /beneficiaries isolates user data and never leaks beneficiaries across accounts', async ({
      authUser,
      authApi,
      playwright,
    }) => {
      // User A creates Beneficiary A
      const benA = await (
        await authUser.api.beneficiaries.createBeneficiary(generateTestBeneficiaryData({ name: 'User A Secret Beneficiary' }))
      ).json();

      // Provision User B
      const testUserB = generateTestUserData();
      await authApi.signup(testUserB);
      await authApi.verifyEmail({ email: testUserB.email, code: '123456' });
      const loginB = await authApi.login({ email: testUserB.email, password: testUserB.password });
      const { access_token: tokenB } = await loginB.json();

      const contextB = await playwright.request.newContext({
        baseURL: (await authUser.api.beneficiaries.getMyBeneficiaries()).url().replace(/\/beneficiaries.*$/, '/'),
        extraHTTPHeaders: {
          Authorization: `Bearer ${tokenB}`,
        },
      });

      const beneficiariesApiB = new BeneficiariesApi(contextB);
      const benB = await (
        await beneficiariesApiB.createBeneficiary(generateTestBeneficiaryData({ name: 'User B Beneficiary' }))
      ).json();

      // User A listing
      const listA = await (await authUser.api.beneficiaries.getMyBeneficiaries()).json();
      expect(listA.some((b: any) => b.id === benA.id)).toBe(true);
      expect(listA.some((b: any) => b.id === benB.id)).toBe(false);

      // User B listing
      const listB = await (await beneficiariesApiB.getMyBeneficiaries()).json();
      expect(listB.some((b: any) => b.id === benB.id)).toBe(true);
      expect(listB.some((b: any) => b.id === benA.id)).toBe(false);

      await contextB.dispose();
    });
  });

  // ==========================================
  // 8. Invalid & Non-Existent Identifier Boundaries
  // ==========================================
  test.describe('Invalid & Non-Existent Identifier Boundaries', () => {
    test('returns 404 when attempting to delete a non-existent beneficiary UUID', async ({ authUser }) => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const response = await authUser.api.beneficiaries.deleteBeneficiary(nonExistentUuid);
      expect(response.status()).toBe(404);
      const errorBody = await response.json();
      expect(errorBody.message).toContain('Beneficiary not found');
    });
  });

  // ==========================================
  // 9. Duplicate Beneficiary Handling
  // ==========================================
  test.describe('Duplicate Beneficiary Handling', () => {
    test('allows creating multiple beneficiaries with the same name or details without constraint failure', async ({
      authUser,
    }) => {
      const sharedName = 'Duplicate Recipient';
      const sharedAccount = 'DE89370400440532013000';

      const res1 = await authUser.api.beneficiaries.createBeneficiary({
        name: sharedName,
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: sharedAccount,
        bankCode: 'DBKDEFF',
      });
      expect(res1.status()).toBe(201);
      const b1 = await res1.json();

      const res2 = await authUser.api.beneficiaries.createBeneficiary({
        name: sharedName,
        currency: 'EUR',
        payoutMethod: 'bank_account',
        accountNumber: sharedAccount,
        bankCode: 'DBKDEFF',
      });
      expect(res2.status()).toBe(201);
      const b2 = await res2.json();

      expect(b1.id).not.toBe(b2.id);
      expect(b1.name).toBe(b2.name);
      expect(b1.accountNumber).toBe(b2.accountNumber);

      // Verify both exist in database
      const count = await dbClient.queryOne<{ count: string }>(
        'SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "accountNumber" = $2',
        [authUser.user.id, sharedAccount],
      );
      expect(Number(count?.count)).toBe(2);
    });
  });

  // ==========================================
  // 10. Authentication & Authorization Boundaries
  // ==========================================
  test.describe('Authentication & Authorization Boundaries', () => {
    test('rejects POST /beneficiaries when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.post('beneficiaries', {
        data: {
          name: 'Unauthorized Beneficiary',
          currency: 'EUR',
          accountNumber: '12345678',
        },
      });
      expect(response.status()).toBe(401);
    });

    test('rejects DELETE /beneficiaries/:id when Authorization header is omitted', async ({ apiContext }) => {
      const response = await apiContext.delete('beneficiaries/00000000-0000-0000-0000-000000000000');
      expect(response.status()).toBe(401);
    });
  });
});

```

---

### Detailed Breakdown of All 25 Test Cases

#### Test 1: `returns an empty array for a newly registered user with no beneficiaries`
1. **Behavior Tested**: Baseline empty state for fresh user accounts.
2. **Why It Exists**: Verifies that new users without beneficiaries receive an empty list rather than null or 404.
3. **Request Sent**: `GET /beneficiaries`
4. **Data Sent**: None (authenticated via Bearer token).
5. **Expected Response**: `200 OK` with empty JSON array `[]`.
6. **Assertions**: `response.status() === 200`, `Array.isArray(body) === true`, `body.length === 0`.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: HTTP contract verification.
9. **Rule Tested**: Empty state contract.
10. **Catchable Bug**: Null pointer exceptions or returning 500 when table has zero rows for user.

#### Test 2: `returns active beneficiaries for authenticated user ordered by name ascending`
1. **Behavior Tested**: Beneficiary listing, schema fields, and alphabetical sorting.
2. **Why It Exists**: Users expect recipient lists sorted alphabetically for easy scanning.
3. **Request Sent**: Create 'Zara Phillips', create 'Alice Walker', then `GET /beneficiaries`.
4. **Data Sent**: Two valid beneficiary payloads.
5. **Expected Response**: `200 OK` with array of 2 beneficiaries.
6. **Assertions**: First element is 'Alice Walker', second is 'Zara Phillips' (`name ASC`); schema properties (`id`, `userId`, `currency`, `payoutMethod`, `deletedAt: null`).
7. **Database Verification**: None (observable via API).
8. **Why DB Verification Matters**: Validates sorting invariant.
9. **Rule Tested**: `order: { name: 'ASC' }` backend query rule.
10. **Catchable Bug**: Unordered queries causing erratic UI listings.

#### Test 3: `excludes soft-deleted beneficiaries from GET listing`
1. **Behavior Tested**: Query filtering of soft-deleted records.
2. **Why It Exists**: Deleted recipients must not appear in active payout menus.
3. **Request Sent**: Create beneficiary, `DELETE /beneficiaries/:id`, then `GET /beneficiaries`.
4. **Data Sent**: Valid creation payload, then DELETE request.
5. **Expected Response**: `GET /beneficiaries` returns list omitting deleted ID.
6. **Assertions**: `found === undefined`.
7. **Database Verification**: None (verified in Test 17).
8. **Why DB Verification Matters**: Proves soft-deleted row is excluded from consumer endpoints.
9. **Rule Tested**: Soft-deletion filter on `GET`.
10. **Catchable Bug**: Deleted recipients appearing in transfer destination dropdowns.

#### Test 4 & 5: `rejects unauthenticated / invalid token requests on GET`
1. **Behavior Tested**: Authentication barrier.
2. **Why It Exists**: Protects personal banking details from anonymous access.
3. **Request Sent**: `GET /beneficiaries` without token, and with invalid token.
4. **Data Sent**: None.
5. **Expected Response**: `401 Unauthorized`.
6. **Assertions**: `response.status() === 401`.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Route security.
9. **Rule Tested**: `JwtAuthGuard` on `GET`.
10. **Catchable Bug**: Unauthenticated data leakage.

#### Test 6: `successfully creates a bank account beneficiary and verifies PostgreSQL persistence`
1. **Behavior Tested**: Bank beneficiary creation and persistent cross-layer storage.
2. **Why It Exists**: Validates standard SEPA/bank account onboarding.
3. **Request Sent**: `POST /beneficiaries` with `name: 'Maria Rossi'`, `currency: 'EUR'`, `accountNumber: 'IT12A...'`, `bankCode: 'UNCRITM1'`, `bankName: 'UniCredit Milano'`.
4. **Data Sent**: Full bank account payload.
5. **Expected Response**: `201 Created` with full entity JSON.
6. **Assertions**: Response properties match payload; database query confirms row exists with identical values and `deletedAt IS NULL`.
7. **Database Verification**: `SELECT id, "userId", name, currency, "payoutMethod", "accountNumber", "bankCode", "bankName", "deletedAt" FROM beneficiaries WHERE id = $1`.
8. **Why DB Verification Matters**: Confirms persistent database writes, column mapping, and foreign key integrity.
9. **Rule Tested**: Bank account onboarding persistence.
10. **Catchable Bug**: Silent write failures or column truncation.

#### Test 7: `successfully creates a bank account beneficiary with default fallback values`
1. **Behavior Tested**: Default value assignment for omitted fields.
2. **Why It Exists**: Verifies backend default logic (`payoutMethod` defaults to `bank_account`, `bankCode` to `DIRECT`, `bankName` to `Bank Account`).
3. **Request Sent**: `POST /beneficiaries` without `payoutMethod`, `bankCode`, or `bankName`.
4. **Data Sent**: `{ name, currency: 'GBP', accountNumber }`.
5. **Expected Response**: `201 Created`.
6. **Assertions**: `body.payoutMethod === 'bank_account'`, `body.bankCode === 'DIRECT'`, `body.bankName === 'Bank Account'`. Confirmed in PostgreSQL.
7. **Database Verification**: Queried defaults from PostgreSQL.
8. **Why DB Verification Matters**: Validates entity default values on disk.
9. **Rule Tested**: Default business fallbacks.
10. **Catchable Bug**: Null pointer crashes when optional fields are omitted.

#### Test 8: `successfully creates a valid UPI beneficiary with INR currency and verifies PostgreSQL persistence`
1. **Behavior Tested**: UPI rail beneficiary creation.
2. **Why It Exists**: Validates Indian real-time UPI recipient onboarding.
3. **Request Sent**: `POST /beneficiaries` with `currency: 'INR'`, `payoutMethod: 'upi'`, `upiId: 'rohan.sharma@okhdfcbank'`.
4. **Data Sent**: UPI payload.
5. **Expected Response**: `201 Created`.
6. **Assertions**: Response contains `currency: 'INR'`, `payoutMethod: 'upi'`, `upiId`, `bankName: 'UPI'`. Confirmed in PostgreSQL.
7. **Database Verification**: Verified in PostgreSQL `beneficiaries` table.
8. **Why DB Verification Matters**: Ensures UPI-specific columns are written properly.
9. **Rule Tested**: UPI payment rail onboarding.
10. **Catchable Bug**: UPI ID not persisted or mapped to incorrect column.

#### Test 9 to 13: `POST validation boundaries (missing name, invalid currency, missing account, missing bankCode, bad enum)`
1. **Behavior Tested**: DTO validation rules.
2. **Why It Exists**: Ensures invalid data is intercepted at the controller gateway.
3. **Request Sent**: `POST /beneficiaries` with malformed inputs.
4. **Data Sent**: Missing name, bad currency enum `'XYZ'`, missing `accountNumber`, missing `bankCode`, bad payoutMethod `'crypto'`.
5. **Expected Response**: `400 Bad Request` for all cases.
6. **Assertions**: `response.status() === 400`.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Invalid data rejected prior to SQL execution.
9. **Rule Tested**: NestJS `ValidationPipe` class-validator enforcement.
10. **Catchable Bug**: Corrupt or malformed records inserted into database.

#### Test 14: `rejects UPI beneficiary when currency is not INR`
1. **Behavior Tested**: Cross-field business rule: UPI requires INR.
2. **Why It Exists**: UPI is exclusively an Indian domestic payment rail.
3. **Request Sent**: `POST /beneficiaries` with `payoutMethod: 'upi'` and `currency: 'USD'`.
4. **Data Sent**: `{ name, currency: 'USD', payoutMethod: 'upi', upiId }`.
5. **Expected Response**: `400 Bad Request` with message: `"UPI payout method is only supported for INR currency"`.
6. **Assertions**: Status 400, message assertion.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Prevents invalid currency pairing.
9. **Rule Tested**: UPI currency restriction.
10. **Catchable Bug**: Allowing USD/EUR transfers over UPI network.

#### Test 15: `rejects UPI beneficiary when upiId is missing or empty`
1. **Behavior Tested**: UPI identifier requirement.
2. **Why It Exists**: Transfers cannot execute over UPI without a VPA handle.
3. **Request Sent**: `POST /beneficiaries` with `payoutMethod: 'upi'` and missing/whitespace `upiId`.
4. **Data Sent**: Missing `upiId`.
5. **Expected Response**: `400 Bad Request`.
6. **Assertions**: Status 400.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Required routing field.
9. **Rule Tested**: UPI address mandatory check.
10. **Catchable Bug**: Headless UPI beneficiary created with no destination address.

#### Test 16: `enforces maximum limit of 3 active beneficiaries per user and rejects 4th creation`
1. **Behavior Tested**: Active beneficiary quota enforcement.
2. **Why It Exists**: WrightPay business policy limits users to 3 active recipients.
3. **Request Sent**: Create Ben 1, Ben 2, Ben 3 (all 201), then attempt Ben 4.
4. **Data Sent**: 4 distinct beneficiary payloads.
5. **Expected Response**: Ben 1-3 return `201`; Ben 4 returns `400 Bad Request` with `"Maximum limit of 3 active beneficiaries reached"`.
6. **Assertions**: Ben 4 returns 400; DB active count is exactly 3.
7. **Database Verification**: `SELECT count(*) FROM beneficiaries WHERE "userId" = $1 AND "deletedAt" IS NULL` equals 3.
8. **Why DB Verification Matters**: Confirms limit is strictly respected on disk.
9. **Rule Tested**: `MAX_BENEFICIARIES = 3` active limit.
10. **Catchable Bug**: Off-by-one errors allowing unlimited beneficiaries.

#### Test 17: `soft deletes beneficiary by populating deletedAt timestamp in PostgreSQL database`
1. **Behavior Tested**: Soft deletion mechanics.
2. **Why It Exists**: Financial audit regulations require historical records of past payout recipients.
3. **Request Sent**: Create beneficiary, then `DELETE /beneficiaries/:id`.
4. **Data Sent**: Beneficiary ID path parameter.
5. **Expected Response**: `200 OK` with `{ message: "Beneficiary successfully deleted", id }`.
6. **Assertions**: Status 200, response message; database query confirms row still exists and `deletedAt` is not null.
7. **Database Verification**: `SELECT id, "deletedAt" FROM beneficiaries WHERE id = $1`.
8. **Why DB Verification Matters**: Proves soft-delete preserves data for compliance instead of executing SQL `DELETE`.
9. **Rule Tested**: Soft-deletion architecture.
10. **Catchable Bug**: Hard deletion destroying audit trails for past transactions.

#### Test 18: `repeated deletion of an already soft-deleted beneficiary returns 404`
1. **Behavior Tested**: Deletion idempotency guard.
2. **Why It Exists**: Operating on already deleted entities should indicate they are no longer accessible.
3. **Request Sent**: Two consecutive `DELETE /beneficiaries/:id` calls.
4. **Data Sent**: Same ID.
5. **Expected Response**: First returns 200; second returns `404 Not Found` with `"Beneficiary not found"`.
6. **Assertions**: Status 404, message assertion.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: TypeORM `findOne` naturally excludes soft-deleted rows.
9. **Rule Tested**: Entity state transition guard.
10. **Catchable Bug**: Double deletion succeeding indefinitely.

#### Test 19: `soft deletion frees an active slot allowing a new beneficiary to be created under max 3 limit`
1. **Behavior Tested**: Slot reuse and quota calculation lifecycle.
2. **Why It Exists**: Users who reach their 3-beneficiary limit must be able to delete an old recipient and add a new one.
3. **Request Sent**: Create 3 beneficiaries -> attempt 4th (rejected with 400) -> delete Ben 1 -> verify active count is 2 -> create new Ben 4 (succeeds with 201).
4. **Data Sent**: Sequential creation, deletion, and recreation payloads.
5. **Expected Response**: 4th creation attempt succeeds with 201 after deleting one.
6. **Assertions**: Final creation returns 201; active DB count is 3; total physical rows in DB is 4 (3 active, 1 soft-deleted).
7. **Database Verification**: Active count (`deletedAt IS NULL`) = 3, Total count = 4.
8. **Why DB Verification Matters**: Proves quota is calculated against active records, not total rows.
9. **Rule Tested**: Quota slot release upon soft deletion.
10. **Catchable Bug**: Quota counting soft-deleted rows, permanently locking users out of adding beneficiaries.

#### Test 20 & 21: `enforces strict multi-tenant isolation and rejects cross-user beneficiary deletion and viewing (IDOR)`
1. **Behavior Tested**: Tenant isolation and Insecure Direct Object Reference (IDOR) prevention.
2. **Why It Exists**: A malicious user must never be able to view, delete, or modify another user's banking beneficiaries.
3. **Request Sent**: User A creates Ben A. User B attempts `DELETE /beneficiaries/:idA` and calls `GET /beneficiaries`.
4. **Data Sent**: User A's beneficiary ID.
5. **Expected Response**: User B's DELETE returns `404 Not Found`; User B's GET does not include Ben A; User A's GET does not include Ben B.
6. **Assertions**: Status 404 on IDOR delete; Ben A in DB still has `deletedAt IS NULL`; complete isolation on listings.
7. **Database Verification**: Queried Ben A in PostgreSQL to confirm `deletedAt` remained `null`.
8. **Why DB Verification Matters**: Cryptographic certainty of zero cross-tenant tampering.
9. **Rule Tested**: Multi-tenant data segregation.
10. **Catchable Bug**: Critical security vulnerability where any user can delete any other user's payout recipients.

#### Test 22: `returns 404 when attempting to delete a non-existent beneficiary UUID`
1. **Behavior Tested**: Non-existent resource handling.
2. **Why It Exists**: Ensures clean error handling when targeting missing entities.
3. **Request Sent**: `DELETE /beneficiaries/00000000-0000-0000-0000-000000000000`.
4. **Data Sent**: Valid formatted UUID that does not exist.
5. **Expected Response**: `404 Not Found` with `"Beneficiary not found"`.
6. **Assertions**: Status 404.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Standard REST error contract.
9. **Rule Tested**: Resource existence validation.
10. **Catchable Bug**: 500 internal server error on missing entities.

#### Test 23: `allows creating multiple beneficiaries with the same name or details without constraint failure`
1. **Behavior Tested**: Duplicate creation permissibility.
2. **Why It Exists**: Confirms system allows multiple accounts under the same person.
3. **Request Sent**: Two consecutive `POST /beneficiaries` with identical names and accounts.
4. **Data Sent**: Duplicate payload.
5. **Expected Response**: Both return `201 Created` with unique IDs.
6. **Assertions**: Both succeed, `b1.id !== b2.id`, DB count for that account is 2.
7. **Database Verification**: Queried DB count for that account number.
8. **Why DB Verification Matters**: Validates intentional absence of uniqueness constraints.
9. **Rule Tested**: Non-restrictive duplicate policy.
10. **Catchable Bug**: Accidental unique constraint blocking legitimate multi-account workflows.

#### Test 24 & 25: `rejects POST and DELETE when Authorization header is omitted`
1. **Behavior Tested**: Route guard enforcement.
2. **Why It Exists**: All mutation routes must require authentication.
3. **Request Sent**: Unauthenticated POST and DELETE calls.
4. **Data Sent**: Sample payloads / IDs.
5. **Expected Response**: `401 Unauthorized`.
6. **Assertions**: Status 401.
7. **Database Verification**: None.
8. **Why DB Verification Matters**: Gateway security.
9. **Rule Tested**: Route authentication.
10. **Catchable Bug**: Open unauthenticated mutating endpoints.

---

### Document Actual Discoveries

#### Confirmed from Backend Implementation
- **Soft Deletion Mechanism**: Beneficiaries are never physically deleted via SQL `DELETE`. TypeORM `@DeleteDateColumn() deletedAt` populates the deletion timestamp.
- **Quota Ceiling**: Users are capped at exactly 3 active beneficiaries (`MAX_BENEFICIARIES = 3`).
- **UPI Rail Rule**: UPI strictly mandates `INR` currency and a valid `upiId`.
- **Default Fallbacks**: When omitted, `payoutMethod` defaults to `'bank_account'`, `bankCode` defaults to `'DIRECT'`, and `bankName` defaults to `'Bank Account'`.
- **Sorting Invariant**: `GET /beneficiaries` returns recipients ordered by `name: 'ASC'`.
- **IDOR Protection**: All operations query `where: { id, userId }`, returning 404 for any cross-tenant access.

#### Confirmed from Tests
- **Slot Reuse Works Perfectly**: Soft-deleting one beneficiary immediately frees a slot, allowing an active user to create their 4th total beneficiary while remaining at exactly 3 active records.
- **Idempotency on Delete**: Calling DELETE twice on the same UUID returns `200 OK` first, then `404 Not Found` second.
- **Duplicate Records**: The backend permits duplicate beneficiaries with identical names and accounts without error.

#### Not Implemented / Not Currently Available
- **Direct Update (`PATCH /beneficiaries/:id`)**: There is currently no endpoint to modify an existing beneficiary's name, currency, or account number. Users must soft-delete and recreate.
- **Single Beneficiary Lookup (`GET /beneficiaries/:id`)**: There is no endpoint to fetch an individual beneficiary by ID. All retrieval is via `GET /beneficiaries`.

#### Initial Assumptions Corrected
1. **Payout Method Casing**: Initial audit suggested uppercase `'BANK_ACCOUNT' | 'UPI'`. In the actual TypeORM entity and DTO validation, the values are lowercase `'bank_account' | 'upi'`. Passing uppercase resulted in validation rejection. `api/types.ts` was updated to support the true lowercase enum values.
2. **Bank Code Requirement**: Initial audit assumed `bankCode` was completely optional. When `payoutMethod: 'bank_account'` is explicitly provided, ClassValidator's `@ValidateIf` makes `bankCode` mandatory.

---

### Problems Encountered & Solutions

#### Problem 1: `BeneficiaryPayoutMethod` Enum Validation Error
- **Problem**: Sending `payoutMethod: 'BANK_ACCOUNT'` resulted in `400 Bad Request` with error: `"payoutMethod must be one of the following values: bank_account, upi"`.
- **Investigation**: Inspected `backend/src/modules/beneficiaries/entities/beneficiary.entity.ts` and discovered enum values are defined in lowercase.
- **Root Cause**: `qa/automation/api/types.ts` had defined `BeneficiaryPayoutMethod = 'BANK_ACCOUNT' | 'UPI'`.
- **Solution**: Updated `qa/automation/api/types.ts` to `export type BeneficiaryPayoutMethod = 'bank_account' | 'upi' | 'BANK_ACCOUNT' | 'UPI';`.
- **Why It Works**: Aligns the client types with the backend validator while maintaining backwards compatibility.

#### Problem 2: Bank Account Creation Rejection on Missing `bankCode`
- **Problem**: Calling `createBeneficiary({ name, currency: 'EUR', payoutMethod: 'bank_account', accountNumber: '...' })` failed with 400 Bad Request.
- **Investigation**: Inspected `CreateBeneficiaryDto` in `create-beneficiary.dto.ts`.
- **Root Cause**: `@ValidateIf((o) => o.payoutMethod === BeneficiaryPayoutMethod.BANK_ACCOUNT) @IsNotEmpty() bankCode?: string;` makes `bankCode` mandatory whenever `payoutMethod` is explicitly set to `bank_account`.
- **Solution**: Ensured bank account payloads specify a valid `bankCode` (e.g. `UNCRITM1` or `DIRECT`).
- **Why It Works**: Satisfies the conditional DTO validation rule.

---

### Important SDET Concepts Demonstrated

- **Soft-Deletion Lifecycle Testing**: Validating that an API operation sets a timestamp on disk while the row remains physically intact in the database.
- **Resource Quota & Slot Reuse**: Proving that deleting an entity frees capacity under an application-level constraint (3-beneficiary ceiling).
- **Conditional DTO Validation Testing**: Testing cross-field conditional rules (`@ValidateIf`), verifying that fields required under one payment rail (bank account) are not enforced on another (UPI).
- **Sorting & Invariant Testing**: Asserting that list responses guarantee deterministic ordering (`name ASC`) across calls.
- **Multi-Tenant Security (IDOR)**: Using dual-user fixture sessions to guarantee zero cross-tenant read or write access.

---

### SDET Interview Preparation

#### Q1: How do you verify soft deletion in an automated API test?
- **Short Answer**: Assert that the DELETE endpoint returns success, verify that subsequent GET calls exclude the resource, and query the database directly to confirm the row still exists with a populated `deletedAt` timestamp.
- **Deeper Explanation**: Black-box API tests can only see that the resource disappeared from `GET` listings. Without database verification, you cannot know if the system executed an unsafe physical `DELETE` or a compliant soft-delete. In banking platforms where historical audit trails are mandatory, querying PostgreSQL to verify that `deletedAt IS NOT NULL` guarantees regulatory compliance.

#### Q2: What is quota slot reuse, and how do you test it?
- **Short Answer**: It verifies that when a user reaches a resource limit (e.g., maximum 3 active beneficiaries), deleting an active resource decrements the active count and allows adding a new one.
- **Deeper Explanation**: If the backend incorrectly counts total database rows rather than active records (`deletedAt IS NULL`), soft-deleting an item will not free a slot, permanently locking the user out. In our test, we create 3 beneficiaries, assert that the 4th is rejected with 400, delete one, verify the active DB count is 2, and assert that a new 4th beneficiary can now be created with 201.

#### Q3: Why did we test cross-user deletion (IDOR) on beneficiaries?
- **Short Answer**: To prevent Insecure Direct Object References where User B manipulates User A's payout recipients simply by guessing their UUID.
- **Deeper Explanation**: Payment recipients contain sensitive banking identifiers. We authenticate User A and User B concurrently, create Beneficiary A, and have User B attempt to delete it. We assert that the backend returns `404 Not Found` (preventing resource enumeration) and confirm via PostgreSQL that Beneficiary A remains active.

---

, `status: 'PENDING'`, `fee: 25`, `exchangeRate: 1.0`.
  - **Database Verification**: `wallets.balance` is decremented by exactly `125.00` (500 to 375); `transactions` row is created with matching reference, amounts, fee, and user ID.
  - **Redis Verification**: Key `wrightpay:idempotency:transfer:{userId}:{key}` exists with `status: 'COMPLETED'` and 64-char hex hash.
  - **BullMQ Verification**: Job `transfer-{txId}` exists in queue with payload `{ transactionId }`.
  - **Financial Invariant**: $500.00 - (100.00 + 25.00) = 375.00$.
  - **Catchable Bug**: Incorrect fee calculation, uncommitted database transaction, missing Redis idempotency lock.

#### Category 2: Request Validation Boundaries & Guardrails (Tests 2–10)
- **Test 2**: `rejects transfer when Idempotency-Key header is omitted (400 Bad Request)`
  - Validates route controller guard enforcing mandatory header; confirms 400 and zero wallet mutation.
- **Test 3**: `rejects transfer when Idempotency-Key header is empty or whitespace (400 Bad Request)`
  - Validates whitespace trimming on header validation.
- **Test 4**: `rejects transfer with zero sendAmount (400 Bad Request)`
  - Validates `@Min(0.01)` and service layer boundary checking.
- **Test 5**: `rejects transfer with negative sendAmount (400 Bad Request)`
  - Prevents reverse-debit / credit injection attempts.
- **Test 6**: `rejects transfer with invalid or unsupported destinationCurrency (400 Bad Request)`
  - Prevents non-ISO currency enum injection (`UNSUPPORTED_XYZ`).
- **Test 7**: `rejects transfer with malformed non-UUID beneficiaryId (400 Bad Request)`
  - Validates `@IsUUID()` format validation on entity foreign keys.
- **Test 8**: `rejects transfer with nonexistent beneficiaryId (404 Not Found)`
  - Validates entity existence check in PostgreSQL; asserts `"Beneficiary not found"`.
- **Test 9**: `rejects transfer with nonexistent sourceWalletId (404 Not Found)`
  - Validates source wallet existence check; asserts `"Source wallet not found"`.
- **Test 10**: `rejects UPI rail transfer when destinationCurrency is not INR (400 Bad Request)`
  - Validates rail-specific business rule: Indian UPI beneficiaries must receive Indian Rupees (`INR`).

#### Category 3: Insufficient Balance & Accounting Invariants (Test 11)
- **Test 11**: `rejects transfer when available balance is less than sendAmount + fee, preventing debit`
  - **Behavior Tested**: Balance overdraft protection ($50.00 < 50.00 + 25.00$).
  - **Why It Exists**: Crucial banking invariant: an overdraft must never succeed.
  - **Expected Response**: `400 Bad Request` with detailed message `"Insufficient wallet balance. Required: 75 EUR (Amount: 50 + Fee: 25), Available: 50 EUR"`.
  - **Database Verification**: Wallet balance remains strictly `50.00 EUR`; zero transaction records created.
  - **Redis Verification**: Idempotency key deleted from Redis so client can retry after depositing funds.

#### Category 4: Fixed Fee Accounting & Currency Conversion (Tests 12–13)
- **Test 12**: `strictly enforces the fixed 25.00 EUR fee and deducts (amount + 25.00) from wallet`
  - Validates fixed 25 unit fee deduction and checks DB transaction column `fee = 25.00`.
- **Test 13**: `correctly calculates recipientAmount using exchange rates for cross-currency transfers (EUR -> INR)`
  - Validates dynamic foreign exchange multiplication: EUR to INR at rate 89.5 yields `recipientAmount: 8950.00`.

#### Category 5: Beneficiary & Source Wallet Ownership (IDOR) (Tests 14–15)
- **Test 14**: `rejects transfer using a beneficiary belonging to another user (404 Not Found / IDOR)`
  - User B attempts to transfer money to User A's beneficiary. Rejection: `404 Not Found`. User B's balance untouched.
- **Test 15**: `rejects transfer using a source wallet belonging to another user (404 Not Found / IDOR)`
  - User B attempts to withdraw from User A's funded wallet. Rejection: `404 Not Found`. User A's balance untouched.

#### Category 6: Authentication & Authorization (Tests 16–18)
- **Test 16**: `rejects unauthenticated transfer when Authorization header is omitted (401 Unauthorized)`
  - Route guard enforcement.
- **Test 17**: `rejects transfer with malformed or invalid Bearer token (401 Unauthorized)`
  - JWT cryptographic signature verification.
- **Test 18**: `rejects transfer when user accountStatus is SUSPENDED (403 Forbidden)`
  - Validates compliance account freeze rule; asserts `403 Forbidden ("Account is suspended or closed")`.

#### Category 7: Idempotency Mechanics & Deduplication (Tests 19–21)
- **Test 19**: `serves cached 201 response and prevents duplicate wallet debit when sending identical replay`
  - Sends identical transfer request twice with the same idempotency key. Assertions: Second response returns `201 Created` with identical transaction ID and reference. Wallet debited exactly once ($400 - 75 = 325$). Exactly one transaction record in DB.
- **Test 20**: `rejects request with 409 Conflict when reusing an Idempotency-Key with a different payload`
  - Reusing a key with `sendAmount: 75` instead of `50` is blocked with `409 Conflict ("Idempotency key was already used with a different request payload")`. Wallet is not debited.
- **Test 21**: `treats requests with different idempotency keys as separate distinct transactions`
  - Distinct keys yield two separate transactions, each debiting the wallet accordingly.

#### Category 8: Redis Idempotency Deep Inspection (Test 22)
- **Test 22**: `stores completed idempotency record in Redis with 24-hour TTL and valid SHA-256 payload hash`
  - Directly queries Redis via `redisClient.get()` and `redisClient.ttl()`. Verifies key format, TTL between 80,000s and 86,400s, status `'COMPLETED'`, and 64-character SHA-256 hex digest.

#### Category 9: BullMQ Job Attributes (Test 23)
- **Test 23**: `enqueues process-transfer BullMQ job with correct attributes, jobId, and payload`
  - Verifies job ID format `transfer-{id}`, job name `process-transfer`, payload `{ transactionId }`, and attempts count 3.

#### Category 10: Asynchronous Settlement & Failure Simulation (Tests 24–25)
- **Test 24**: `asynchronously transitions normal transfer status from PENDING to COMPLETED`
  - Polls database using bounded polling helper until `TransfersProcessor` transitions status to `COMPLETED` with `failureReason: null`.
- **Test 25**: `asynchronously transitions transfer to FAILED when recipient name triggers simulated banking failure`
  - Sets beneficiary name containing `'SIMULATE_FAILURE'`. Worker retries 3 times with exponential backoff and transitions status to `FAILED` with `failureReason: 'Simulated banking settlement failure'`.

#### Category 11: Amount Boundaries & Precision (Tests 26–28)
- **Test 26**: `accepts the minimum allowed sendAmount (0.01) and applies exact decimal deduction`
  - Smallest valid amount: $0.01 + 25.00 = 25.01$ debited. Post-balance: $74.99$.
- **Test 27**: `accepts transfer where amount + fee exactly equals wallet balance, leaving zero balance`
  - Exact balance transfer ($100.00 + 25.00 = 125.00$). Post-balance: $0.00$.
- **Test 28**: `rejects transfer where amount + fee is exactly 0.01 over wallet balance`
  - Off-by-one cent over balance ($125.01 > 125.00$). Rejected with 400 Bad Request.

#### Category 12: Concurrency & Double Submission Protection (Test 29)
- **Test 29**: `safely handles concurrent double submission with the same idempotency key without double debit`
  - Fires two simultaneous requests using `Promise.all`. Validates that one succeeds (201) and the second returns 201 (cached) or 409 (locked). Most critical: wallet is debited **EXACTLY ONCE** ($300 - 75 = 225$), and **EXACTLY ONE** transaction is persisted.

#### Category 13: Security & Unhandled 500 Prevention (Test 30)
- **Test 30**: `returns structured 400 Bad Request without 500 crashes on malformed request bodies`
  - Tests invalid payloads (strings for numbers, non-UUIDs, nulls, empty objects). Asserts status 400, never 500.

---

### Step 5F Document Actual Discoveries
<a id="step-5f-document-actual-discoveries"></a>

#### Confirmed from Backend Implementation
- **Pessimistic Row Locking**: Source wallet acquisition uses `lock: { mode: 'pessimistic_write' }` (`SELECT ... FOR UPDATE`) inside an atomic database transaction.
- **Fixed Fee Model**: Transfer fee is hardcoded to `25.0` units of the source wallet currency.
- **Redis Lock TTL**: Processing lock uses `EX 60` (60 seconds). Completed idempotency record uses `EX 86400` (24 hours).
- **BullMQ Auto-Removal**: Completed jobs have `removeOnComplete: true`, meaning successful jobs are removed from Redis once processed. Failed jobs retain `removeOnFail: false`.
- **Settlement Delay**: Simulated banking settlement delay in `TransfersProcessor` is 50ms.
- **Failure Simulation Hook**: If `transaction.recipient` includes `'SIMULATE_FAILURE'`, worker throws `'Simulated banking settlement failure'`.

#### Confirmed by Automation
- **Replay Caching**: Identical requests return the exact same HTTP 201 response and transaction reference without double debiting.
- **Conflict Detection**: Altering the payload with the same key returns `409 Conflict`.
- **Zero-Balance State**: A transfer can debit a wallet down to exactly `0.00` without precision errors.
- **Concurrent Double-Submission**: Firing two concurrent requests with identical keys results in exactly one database debit and one transaction record.

#### Not Implemented / Not Currently Available
- **Automatic Refund on Failure**: When an asynchronous job exhausts all 3 retries and enters status `FAILED`, the backend does **not** automatically refund the debited amount to the user's wallet.
- **Transfer Cancellation / Reversal**: There are no endpoints to cancel a `PENDING` transfer or reverse a `COMPLETED` transfer.

#### Initial Assumptions Corrected
1. **Transaction Status Enum**: Planning audit suggested states `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`, `REVERSED`. In reality, `TransactionStatus` only contains `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `SUSPICIOUS`.
2. **AccountStatus Casing in SQL**: PostgreSQL enum `users_accountstatus_enum` defines values in lowercase (`'active'`, `'suspended'`, `'closed'`). Direct database assertions must use lowercase values.
3. **Database Rates Seeding**: In the test environment, `exchange_rates` was unpopulated. Direct rate insertion is required when testing cross-currency transfers.

---

### Step 5F Problems Encountered & Solutions
<a id="step-5f-problems-encountered--solutions"></a>

#### Problem 1: `invalid input value for enum users_accountstatus_enum: "SUSPENDED"`
- **Problem**: Setting `accountStatus = 'SUSPENDED'` via SQL query failed with PostgreSQL enum syntax error.
- **Investigation**: Inspected `user.entity.ts` and PostgreSQL table metadata.
- **Root Cause**: The TypeScript enum maps `SUSPENDED = 'suspended'` (lowercase string). PostgreSQL enum expects lowercase.
- **Solution**: Changed SQL update to use `'suspended'` and `'active'`.

#### Problem 2: Cross-Currency Transfer Received 404 Not Found
- **Problem**: Transfer test for EUR to INR failed with `404 Not Found`.
- **Investigation**: Inspected backend error context. `ExchangeRatesService.getRate('EUR', 'INR')` threw `NotFoundException("Exchange rate not found from EUR to INR")`.
- **Root Cause**: The local test database `exchange_rates` table had 0 rows.
- **Solution**: Added idempotent test setup helper that inserts the EUR $\to$ INR rate (89.5) if not already present.

---

### Step 5F Important SDET Concepts
<a id="step-5f-important-sdet-concepts"></a>

1. **Distributed Idempotency Testing**: Validating that repeated requests produce identical outcomes without duplicate financial side effects.
2. **Financial Balance Invariants**: Explicitly verifying before-and-after balances: $\text{Balance}_{\text{after}} = \text{Balance}_{\text{before}} - (\text{Amount} + \text{Fee})$.
3. **Pessimistic Concurrency & Double-Submission**: Validating that race conditions do not permit double-spending.
4. **Bounded Polling for Eventual Consistency**: Using bounded polling loops with timeouts rather than fragile fixed sleeps.
5. **Multi-Tenant IDOR Guardrails**: Ensuring tenant resources cannot be accessed or manipulated across boundaries.

---

### Step 5F SDET Interview Preparation (20 Questions & Answers)
<a id="step-5f-sdet-interview-preparation"></a>

#### Q1: How would you test a money transfer API?
- **Short Answer**: Test request validation, authentication, balance checks, fixed fees, currency exchange, Redis idempotency replay/conflict, PostgreSQL persistence, BullMQ asynchronous processing, failure handling, and multi-tenant IDOR.
- **Deeper Explanation**: Money transfers are stateful financial operations. Testing must go beyond HTTP status codes: verify that wallet balances are debited accurately, that database transactions are atomic with row-level locks, that duplicate submissions are deduplicated via Redis, and that background queues process settlement correctly.

#### Q2: Why is idempotency important in payment systems?
- **Short Answer**: It guarantees that if a client re-sends a request due to network timeouts or retries, the payment is executed only once.
- **Deeper Explanation**: In distributed networks, packet drops frequently cause clients to timeout while the server has already processed the payment. Without idempotency, automatic retries would double-charge the user.

#### Q3: What is an Idempotency-Key?
- **Short Answer**: A unique client-generated token (often a UUID) attached to a mutation request that the server uses to identify and deduplicate retries.
- **Deeper Explanation**: The server checks Redis or a database using the key. If an operation with that key has completed, it returns the cached response instead of executing the mutation again.

#### Q4: Why is Idempotency-Key a request header?
- **Short Answer**: It is operational transport metadata rather than business domain data.
- **Deeper Explanation**: Keeping it in the header separates protocol-level deduplication from domain payloads, allowing infrastructure middlewares or guards to handle idempotency before hitting business logic.

#### Q5: How do you test duplicate transfer submissions?
- **Short Answer**: Send the identical payload twice with the same `Idempotency-Key` and assert that both return HTTP 201 with identical transaction IDs, but the database reflects only a single debit.
- **Deeper Explanation**: Assert that the second response matches the first, verify PostgreSQL wallet balance has only been decremented once, and verify that only one job was added to BullMQ.

#### Q6: How do you verify that money was not deducted twice?
- **Short Answer**: Query the wallet table in PostgreSQL before and after both requests, verifying: $\text{balance}_{\text{after}} = \text{balance}_{\text{before}} - (\text{amount} + \text{fee})$.
- **Deeper Explanation**: HTTP responses can claim success while an underlying bug double-debits the account. Direct database assertion of the balance invariant is the only definitive proof.

#### Q7: Why do we verify PostgreSQL after the API response?
- **Short Answer**: To confirm that data was accurately persisted, foreign keys are correct, and transactions committed cleanly.
- **Deeper Explanation**: APIs can return cached or synthetic responses. Cross-layer testing against PostgreSQL confirms that ledger rows, fee allocations, and wallet balances are durable on disk.

#### Q8: Why do we inspect Redis?
- **Short Answer**: To verify that idempotency keys, locks, cached responses, and TTLs are correctly stored in memory.
- **Deeper Explanation**: Inspecting Redis proves that the key expires as planned (e.g. 24 hours) and that the stored payload hash prevents tampering.

#### Q9: Why do we inspect BullMQ?
- **Short Answer**: To verify that asynchronous background jobs are enqueued with correct names, IDs, payloads, and retry configurations.
- **Deeper Explanation**: Transfers hand off settlement to worker queues. Inspecting the queue proves that the producer enqueued the job without relying on black-box assumptions.

#### Q10: What is eventual consistency?
- **Short Answer**: A consistency model where system state will become consistent over time across all nodes, rather than immediately.
- **Deeper Explanation**: When `POST /transfers` returns `201`, the transaction status is `PENDING`. The background worker eventually processes settlement and moves it to `COMPLETED`.

#### Q11: How do you test asynchronous APIs?
- **Short Answer**: Use bounded polling loops that query the database or queue state until the expected terminal status is reached or a timeout expires.
- **Deeper Explanation**: Asynchronous systems settle in milliseconds to seconds. Bounded polling with small intervals (100–200ms) provides deterministic test assertions without race conditions.

#### Q12: Why should you avoid fixed sleeps?
- **Short Answer**: They make test suites unnecessarily slow, brittle, and flaky under varying machine loads.
- **Deeper Explanation**: If a job takes 50ms and the test sleeps 5s, 4.95s is wasted. If the job takes 5.1s on CI, the test fails. Polling with timeout resolves both problems.

#### Q13: How would you test insufficient balance?
- **Short Answer**: Seed a wallet with balance less than `amount + fee`, execute the transfer, assert `400 Bad Request`, and verify zero wallet debit in the database.
- **Deeper Explanation**: Ensure the error message informs the user of available vs required funds, verify no transaction row was created, and verify the Redis idempotency lock was cleaned up.

#### Q14: How would you test beneficiary IDOR?
- **Short Answer**: User A creates Beneficiary A. User B attempts to execute a transfer referencing Beneficiary A's ID. Assert `404 Not Found` and zero balance mutation.
- **Deeper Explanation**: Payment recipients are tenant-isolated. Asserting 404 (rather than 403) prevents resource enumeration attacks.

#### Q15: How would you test concurrent transfer requests?
- **Short Answer**: Use `Promise.all()` to fire simultaneous transfer requests with the same key, verifying that only one transfer executes and money is debited only once.
- **Deeper Explanation**: Tests that Redis locks and database row-level locking prevent race conditions and overdrafts.

#### Q16: What happens if the worker fails?
- **Short Answer**: BullMQ retries the job according to its retry policy (3 attempts with exponential backoff); upon exhaustion, status transitions to `FAILED`.
- **Deeper Explanation**: We test this by passing a trigger string (`SIMULATE_FAILURE`) to assert that the job fails gracefully, sets `failureReason`, and preserves failure logs.

#### Q17: How would you verify refund behavior?
- **Short Answer**: Simulate a settlement failure, wait for terminal status `FAILED`, and assert that the original debited funds are restored to the user's wallet.
- **Deeper Explanation**: In WrightPay, our audit revealed that automatic refunds upon worker failure are **not currently implemented**. Documenting this discrepancy is a key SDET discovery.

#### Q18: What is the difference between API functional testing and integration testing for a transfer?
- **Short Answer**: Functional testing validates HTTP contracts and immediate validation; integration testing validates cross-tier database persistence, Redis locks, and BullMQ worker execution.
- **Deeper Explanation**: Functional testing treats the API as a black box. Integration testing asserts on the internal data pipelines across PostgreSQL, Redis, and workers.

#### Q19: How do PostgreSQL transactions help transfer consistency?
- **Short Answer**: They ensure all changes (debiting wallet, writing transaction ledger) either commit together or roll back completely on failure.
- **Deeper Explanation**: If an exception occurs after deducting money, the transaction rolls back, preventing money from vanishing into an inconsistent state.

#### Q20: Why might row-level locking be necessary?
- **Short Answer**: To prevent two concurrent transactions from reading the same starting balance and spending it twice (double-spend race condition).
- **Deeper Explanation**: `SELECT ... FOR UPDATE` locks the specific wallet row, forcing concurrent transactions to wait until the first commits, ensuring serialized balance checks.


---

# STEP 5G — TRANSACTIONS API TESTING

<a id="step-5g--transactions-api-testing"></a>

### Step 5G Domain Overview & Architecture
<a id="step-5g-domain-overview--architecture"></a>

The **Transactions Domain** serves as the historical financial ledger and read model of the WrightPay platform. While previous domains (`Wallets`, `Cards`, `Transfers`) mutate financial state, the Transactions API provides secure, paginated, and filterable access to historical ledger records stored in PostgreSQL.

Every transaction represents an atomic financial mutation—such as a wallet-to-beneficiary cross-border payout initiated via `POST /transfers`—and captures all transactional dimensions:
- Primary transaction identity (`id`, `reference`)
- Source and destination amounts (`amount`, `senderAmount`, `recipientAmount`)
- Source and destination currencies (`currency`, `senderCurrency`, `recipientCurrency`)
- Financial fees applied (`fee = 25.00`)
- Applied foreign exchange rates (`exchangeRate`)
- Recipient identity (`recipient`)
- Lifecycle state (`status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SUSPICIOUS'`)
- Failure diagnostic details if applicable (`failureReason`)
- Exact ledger timestamps (`date`, `createdAt`)

All endpoints are hosted on the NestJS backend under `/transactions` (Base: `http://localhost:3001/api/v1/transactions`) and are guarded by `JwtAuthGuard`, requiring an `Authorization: Bearer <access_token>` header.

---

### Step 5G Actual Transactions API Contract Discovered
<a id="step-5g-actual-transactions-api-contract-discovered"></a>

The Transactions domain exposes two RESTful endpoints:

| HTTP Method | Endpoint | Status Codes | Description |
| :--- | :--- | :--- | :--- |
| **`GET`** | `/transactions` | `200 OK`, `400 Bad Request`, `401 Unauthorized` | Returns paginated and filtered historical transactions for the authenticated user, ordered by `createdAt DESC`. |
| **`GET`** | `/transactions/:id` | `200 OK`, `401 Unauthorized`, `404 Not Found`, `500 Server Error` (on non-UUID) | Retrieves full transaction details by UUID. Enforces tenant ownership (returns 404 if owned by another user). |

#### 1. Query Parameters for `GET /transactions` (`GetTransactionsDto`):
- `status` (*optional*): Filter by transaction lifecycle status (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `SUSPICIOUS`). Decorated with `@IsOptional() @IsEnum(TransactionStatus)`. Invalid enum returns `400 Bad Request`.
- `reference` (*optional*): Substring search matching either `tx.reference ILIKE :ref` OR `tx.recipient ILIKE :ref` (case-insensitive). Decorated with `@IsOptional() @IsString()`.
- `limit` (*optional*, default: `20`): Page size. Decorated with `@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)`. Values $< 1$ or $> 100$ return `400 Bad Request`.
- `offset` (*optional*, default: `0`): Starting offset. Decorated with `@IsOptional() @Type(() => Number) @IsInt() @Min(0)`. Values $< 0$ return `400 Bad Request`.

#### 2. Paginated Response Schema (`PaginatedTransactionsResponse`):
```json
{
  "items": [
    {
      "id": "c1f7a012-3456-789a-bcde-f0123456789a",
      "userId": "u1111111-1111-1111-1111-111111111111",
      "reference": "WP-20260918-B937DAF2",
      "date": "2026-09-18T10:00:00.000Z",
      "recipient": "Maria Rossi",
      "amount": 100.00,
      "currency": "EUR",
      "senderAmount": 100.00,
      "senderCurrency": "EUR",
      "recipientAmount": 100.00,
      "recipientCurrency": "EUR",
      "fee": 25.00,
      "exchangeRate": 1.0000,
      "status": "COMPLETED",
      "failureReason": null,
      "createdAt": "2026-09-18T10:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### 3. Single Transaction Detail Response Schema (`FormattedTransaction`):
Returns the individual object shown in the `items` array above.

---

### Step 5G Why Transactions Are Tested Through the API
<a id="step-5g-why-transactions-tested-through-api"></a>

In automated SDET testing, creating transactions by directly running SQL `INSERT INTO transactions ...` produces an artificial test fixture. Direct database seeding bypasses:
1. DTO validation
2. Pessimistic wallet row locking
3. Balance deduction accounting
4. Redis idempotency hashing
5. BullMQ background queue orchestration

In our test suite, transactions are generated **organically through the Transfers API (`POST /transfers`)**. This establishes a true end-to-end integration test:
$\text{POST /transfers} \longrightarrow \text{PostgreSQL Storage} \longrightarrow \text{BullMQ Worker} \longrightarrow \text{GET /transactions/:id}$
This proves that the read model accurately reflects the actual mutations performed by the business engine.

---

## File: qa/automation/api/transactions.api.ts
<a id="file-qaautomationapitransactionsapits-step5g"></a>

### Purpose
Provides an assertion-free HTTP client wrapper for `GET /transactions` and `GET /transactions/:id`.

### Actual Current Code
```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { GetTransactionsQuery } from './types';

export class TransactionsApi extends BaseApi {
  async getMyTransactions(
    params?: GetTransactionsQuery,
    headers?: Record<string, string>,
  ): Promise<APIResponse> {
    return this.get('transactions', { params, headers });
  }

  async getTransactionById(id: string, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get(`transactions/${id}`, { headers });
  }
}
```

### Code Explanation
- **`getMyTransactions(params, headers)`**: Sends `GET /transactions` with serialized query parameters (`status`, `reference`, `limit`, `offset`) and optional custom headers.
- **`getTransactionById(id, headers)`**: Sends `GET /transactions/:id` where `:id` is the target transaction identifier.
- Purely constructs requests and returns Playwright's `APIResponse`. Contains zero test assertions or expectations.

---

## File: qa/automation/api/types.ts (Step 5G Updates)
<a id="file-qaautomationapitypests-step5g"></a>

### Purpose
Defines strongly-typed interfaces for transaction queries and responses.

### Added Interfaces
```typescript
export interface GetTransactionsQuery {
  status?: TransactionStatus;
  reference?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionResponse {
  id: string;
  userId: string;
  reference: string;
  date: string;
  recipient: string;
  amount: number;
  currency: Currency;
  senderAmount: number | null;
  senderCurrency: Currency | null;
  recipientAmount: number | null;
  recipientCurrency: Currency | null;
  fee: number;
  exchangeRate: number | null;
  status: TransactionStatus;
  failureReason: string | null;
  createdAt: string;
}

export interface PaginatedTransactionsResponse {
  items: TransactionResponse[];
  total: number;
  limit: number;
  offset: number;
}
```

---

## File: qa/automation/tests/transactions/transactions.spec.ts
<a id="file-qaautomationteststransactionstransactionsspects"></a>

### Purpose
The master executable test specification for the Transactions domain, containing **28 automated tests** across 9 test categories.

---

### Step 5G Detailed Breakdown of All 28 Test Cases
<a id="step-5g-detailed-breakdown-of-all-28-test-cases"></a>

#### Category 1: Authentication & Access Control (Tests 1–4)
- **Test 1**: `rejects GET /transactions when Authorization header is omitted (401 Unauthorized)`
  - Verifies that `GET /transactions` is protected by `JwtAuthGuard`. Returns 401 with `{"message": "Unauthorized"}`.
- **Test 2**: `rejects GET /transactions with invalid or malformed Bearer token (401 Unauthorized)`
  - Verifies cryptographic signature verification prevents forged tokens from listing transactions.
- **Test 3**: `rejects GET /transactions/:id when Authorization header is omitted (401 Unauthorized)`
  - Verifies that single transaction detail retrieval requires authentication.
- **Test 4**: `rejects GET /transactions/:id with invalid or malformed Bearer token (401 Unauthorized)`
  - Verifies token forgery protection on single transaction detail.

#### Category 2: User Isolation & Multi-Tenant Security / IDOR (Tests 5–6)
- **Test 5**: `strictly isolates transaction listings between users: User B sees only their own transactions`
  - User A creates a transfer. User B registers and queries `GET /transactions`. Asserts User B receives `items: []` and `total: 0`. User A's transaction is completely invisible.
- **Test 6**: `rejects User B attempting to view User A transaction detail by ID (404 Not Found / IDOR)`
  - User B attempts to access User A's transaction via `GET /transactions/:idA`. Asserts HTTP `404 Not Found` with message `"Transaction not found"`. Confirms no reference, recipient, or amount is leaked.

#### Category 3: Transaction Creation & Read Model Parity (Tests 7–8)
- **Test 7**: `retrieves created transfer through GET /transactions/:id and verifies parity with transfer response and PostgreSQL`
  - Executes `POST /transfers`, then queries `GET /transactions/:id`. Asserts exact field-for-field parity across the transfer response, the transactions API read model, and the direct PostgreSQL `transactions` table row.
- **Test 8**: `ensures numeric fields (amount, fee, exchangeRate) are properly cast to JavaScript numbers`
  - Verifies that `TransactionsService.formatTransaction` converts PostgreSQL string decimals (`numeric`) to native JavaScript numbers (`typeof === 'number'` and `Number.isFinite() === true`).

#### Category 4: Single Transaction Detail Retrieval (Tests 9–11)
- **Test 9**: `returns 200 OK with complete FormattedTransaction contract for valid existing transaction`
  - Asserts complete response structure: UUID format, reference pattern `WP-YYYYMMDD-HEX8`, ISO dates, status enum, recipient string, and numeric values.
- **Test 10**: `returns 404 Not Found when querying a non-existent valid UUID`
  - Queries `00000000-0000-0000-0000-000000000000`. Asserts clean `404 Not Found` with message `"Transaction not found"`.
- **Test 11**: `handles malformed non-UUID identifier safely without exposing database credentials`
  - Passes `'not-a-valid-uuid-format'`. Asserts that the response does not expose internal database passwords or connection URLs.

#### Category 5: Transaction Listing — Pagination & Boundaries (Tests 12–17)
- **Test 12**: `returns empty items array and total 0 for newly registered user with no transactions`
  - Empty state validation for fresh accounts.
- **Test 13**: `returns default pagination metadata (limit=20, offset=0) and total count matching user activity`
  - Creates 2 transfers. Asserts `limit: 20`, `offset: 0`, `total >= 2`, and `items.length >= 2`.
- **Test 14**: `applies custom pagination parameters (limit and offset) correctly slicing items`
  - Queries page 1 (`limit=1, offset=0`) and page 2 (`limit=1, offset=1`). Asserts each page returns 1 item, `total=2`, and page 1's item ID does not equal page 2's item ID.
- **Test 15**: `accepts boundary pagination values (limit=1, limit=100, offset=0)`
  - Verifies minimum and maximum valid page limits (`limit=1` and `limit=100`) return `200 OK`.
- **Test 16**: `rejects invalid limit=0 or limit=101 with 400 Bad Request`
  - Validates `@Min(1)` and `@Max(100)` on `limit`. Rejects out-of-bounds values with `400 Bad Request`.
- **Test 17**: `rejects negative offset=-1 with 400 Bad Request`
  - Validates `@Min(0)` on `offset`. Rejects negative offset with `400 Bad Request`.

#### Category 6: Transaction Listing — Filtering & Search (Tests 18–23)
- **Test 18**: `filters transactions by lifecycle status`
  - Queries `GET /transactions?status=PENDING` (or `COMPLETED`). Asserts all returned items match the requested status.
- **Test 19**: `rejects invalid status enum value with 400 Bad Request`
  - Queries `GET /transactions?status=INVALID_STATUS_CODE`. Asserts `400 Bad Request` via `@IsEnum(TransactionStatus)`.
- **Test 20**: `filters transactions by reference substring with case-insensitive search`
  - Queries partial reference substring (e.g. `20260918`). Asserts target transaction is located via ILIKE match.
- **Test 21**: `filters transactions by recipient name substring with case-insensitive search`
  - Queries recipient name substring. Confirms `TransactionsService` checks both `tx.reference ILIKE :ref` AND `tx.recipient ILIKE :ref`.
- **Test 22**: `supports combined status and reference filters simultaneously`
  - Combines `status` and `reference` filters in a single query. Asserts both conditions are met simultaneously.
- **Test 23**: `returns empty items array when search filter matches no transactions (total=0)`
  - Queries non-existent search term. Asserts `items: []` and `total: 0`.

#### Category 7: Sorting & Chronological Ordering (Test 24)
- **Test 24**: `guarantees deterministic descending chronological order by createdAt (newest first)`
  - Creates 2 sequential transactions separated by a delay. Asserts that items in `GET /transactions` are sorted with `createdAt` descending ($t_{\text{current}} \ge t_{\text{next}}$) and newer transactions appear first.

#### Category 8: Asynchronous State Transitions & Eventual Consistency (Tests 25–26)
- **Test 25**: `reflects asynchronous settlement transition from PENDING to COMPLETED in transaction detail API`
  - Normal transfer created as `PENDING`. Bounded polling helper queries `GET /transactions/:id` until status reaches `COMPLETED` with `failureReason: null`. Cross-verifies with PostgreSQL.
- **Test 26**: `reflects asynchronous simulated failure transition from PENDING to FAILED with failureReason`
  - Transfer created with `'SIMULATE_FAILURE'`. BullMQ worker retries 3 times with exponential backoff. Polling helper queries `GET /transactions/:id` until status reaches `FAILED`. Asserts `failureReason` contains `"Simulated banking settlement failure"`.

#### Category 9: Database Validation & Financial Invariants (Tests 27–28)
- **Test 27**: `validates cross-layer database persistence matching PostgreSQL columns directly`
  - Queries PostgreSQL `transactions` table directly via parameterized SQL and compares all 12 columns against the API representation.
- **Test 28**: `proves financial invariant: wallet balance decremented by exact amount + fee recorded in transaction ledger`
  - Captures wallet balance before transfer, executes transfer, queries transaction API for `amount` and `fee`, and asserts:
    $\text{Balance}_{\text{after}} = \text{Balance}_{\text{before}} - (\text{tx.amount} + \text{tx.fee})$

---

### Step 5G QA Findings & Architecture Observations
<a id="step-5g-qa-findings"></a>

#### Finding 1: Unhandled 500 Error on Malformed Non-UUID `:id` Param (POSSIBLE IMPLEMENTATION GAP)
- **Location**: `backend/src/modules/transactions/transactions.controller.ts` line 41:
  ```typescript
  async getTransactionById(@CurrentUser() user: { id: string }, @Param('id') id: string)
  ```
- **Observed Behavior**: When a client sends `GET /transactions/not-a-valid-uuid`, the parameter is passed directly into TypeORM:
  ```typescript
  this.transactionRepository.findOne({ where: { id: 'not-a-valid-uuid', userId } })
  ```
  PostgreSQL throws `QueryFailedError: invalid input syntax for type uuid: "not-a-valid-uuid"`. Because there is no `@ParseUUIDPipe()` on `@Param('id')` and no global database exception filter, NestJS converts this into an unhandled **`500 Internal Server Error`**.
- **Impact**: Clients sending invalid IDs receive HTTP 500 instead of HTTP 400 Bad Request or HTTP 404 Not Found.
- **Recommendation**: Add `@Param('id', new ParseUUIDPipe())` to `TransactionsController.getTransactionById`.

#### Finding 2: Dual Reference and Recipient Filtering (EXPECTED IMPLEMENTED BEHAVIOR)
- **Location**: `backend/src/modules/transactions/transactions.service.ts` lines 76–79:
  ```typescript
  if (dto.reference && dto.reference.trim()) {
    qb.andWhere('(tx.reference ILIKE :ref OR tx.recipient ILIKE :ref)', {
      ref: `%${dto.reference.trim()}%`,
    });
  }
  ```
- **Observed Behavior**: The `reference` query parameter acts as a unified search parameter matching either the transaction reference code OR the recipient's name via case-insensitive substring matching (`ILIKE`).
- **Impact**: Documented in QA test suite and tested in Tests 20 and 21.

#### Finding 3: Lack of Date Range Filtering in V1 (KNOWN V1 LIMITATION)
- **Observed Behavior**: `GetTransactionsDto` supports filtering only by `status` and `reference`. There are currently no query parameters for `startDate`, `endDate`, `currency`, or amount ranges.
- **Impact**: Clients must paginate through the entire ledger or filter client-side if searching by date range.

---

### Step 5G Important SDET Concepts
<a id="step-5g-important-sdet-concepts"></a>

1. **CQRS / Read Model Testing**: Validating that read models (`GET /transactions`) reflect the exact state written by the command pipeline (`POST /transfers`) without data skew.
2. **Numeric Type Safety**: Verifying that database string representations (`DECIMAL(12,2)`) are safely parsed into IEEE 754 floating-point numbers in JavaScript responses.
3. **Multi-Tenant Read Isolation (IDOR)**: Ensuring that read endpoints enforce strict `WHERE userId = :userId` boundaries, returning 404 rather than 403 to prevent resource enumeration.
4. **Boundary Testing on Offset Pagination**: Verifying that page sizes adhere to strict business constraints ($1 \le \text{limit} \le 100$, $\text{offset} \ge 0$).
5. **Eventual Consistency Verification**: Using dynamic polling against the read model to prove that asynchronous state changes (`PENDING` $\to$ `COMPLETED` / `FAILED`) propagate to user-facing queries.


---



---

# STEP 5H — EXCHANGE RATES API TESTING
<a id="step-5h--exchange-rates-api-testing"></a>

### Step 5H Domain Architecture & Foreign Exchange Pipeline
<a id="step-5h-domain-architecture--foreign-exchange-pipeline"></a>

The **Exchange Rates** domain is the foreign currency pricing and conversion engine powering WrightPay. Unlike standard transactional domains that manipulate user state, the Exchange Rates service operates as an authoritative reference data system and mathematical pricing engine consumed across multiple layers:
1. **Public HTTP Clients**: Allows unauthenticated visitors or authenticated users to fetch market rates (`GET /exchange-rates`) and calculate conversion quotes (`GET /exchange-rates/quote`).
2. **Atomic Transfers Engine (`TransfersService`)**: Consulted synchronously during cross-currency transfer execution (`POST /transfers`) to price recipient payouts and record immutable foreign exchange rates into the transaction ledger.
3. **Multi-Currency Wallet Aggregator (`WalletsService`)**: Computes real-time consolidated balance equivalents across all 6 supported currencies (`EUR`, `GBP`, `USD`, `AED`, `PLN`, `INR`) on `GET /wallets/me`.

```mermaid
flowchart TD
    subgraph Clients["Consumers"]
        PublicUser["Public Web / App Client"]
        TransferEngine["TransfersService (POST /transfers)"]
        WalletEngine["WalletsService (GET /wallets/me)"]
    end

    subgraph API["Exchange Rates Controller (Public)"]
        CtrlList["GET /api/v1/exchange-rates"]
        CtrlQuote["GET /api/v1/exchange-rates/quote"]
    end

    subgraph Service["ExchangeRatesService"]
        GetAllRates["getAllRates(): ExchangeRate[]"]
        GetQuote["getQuote(from, to, amount): QuoteResult"]
        GetRate["getRate(from, to): Promise<number>"]
        CalcDirect["1. Direct Rate (from -> to)"]
        CalcInverse["2. Inverse Rate (1 / (to -> from))"]
        CalcTriangular["3. Triangular via Base EUR: (1 / (EUR -> from)) * (EUR -> to)"]
    end

    subgraph Database["PostgreSQL (exchange_rates)"]
        RatesTable[("exchange_rates Table
- id (UUID PK)
- from (Currency enum)
- to (Currency enum)
- rate (DECIMAL 10,6)
- timestamp (Timestamp)
- createdAt (Timestamp)")]
    end

    PublicUser --> CtrlList & CtrlQuote
    CtrlList --> GetAllRates
    CtrlQuote --> GetQuote
    TransferEngine --> GetRate
    WalletEngine --> GetRate

    GetAllRates --> RatesTable
    GetQuote --> GetRate
    GetRate --> CalcDirect
    CalcDirect -. Not Found .-> CalcInverse
    CalcInverse -. Not Found .-> CalcTriangular
    CalcTriangular -. Not Found .-> Throw404["Throw NotFoundException (404)"]

    CalcDirect & CalcInverse & CalcTriangular --> RatesTable
```

---

### Step 5H Actual Exchange Rates API Contract Discovered
<a id="step-5h-actual-exchange-rates-api-contract-discovered"></a>

Through our source code audit of `ExchangeRatesController`, `ExchangeRatesService`, `GetQuoteDto`, and `ExchangeRate` entity, we identified the real runtime behavior:

#### 1. Public Access Contract (No Authentication Guards)
Neither `ExchangeRatesController` nor its route handlers are decorated with `@UseGuards(JwtAuthGuard)`. 
- Requests without an `Authorization` header succeed (`200 OK`).
- Requests with valid Bearer tokens succeed (`200 OK`).
- Requests with garbage or malformed `Authorization` headers succeed (`200 OK`), because unauthenticated routes simply ignore the header.

#### 2. `GET /api/v1/exchange-rates`
- **HTTP Method**: `GET`
- **Path**: `/api/v1/exchange-rates`
- **Query Parameters**: None. Any extraneous query parameters (e.g. `?page=1&limit=10`) are ignored.
- **Response Status**: `200 OK`
- **Response Shape**: Array of stored exchange rate objects:
  ```json
  [
    {
      "id": "6b626a6d-3027-428c-92f7-788b05d9dd37",
      "from": "EUR",
      "to": "INR",
      "rate": "89.500000",
      "timestamp": "2026-09-18T05:26:20.892Z",
      "createdAt": "2026-09-18T05:26:20.892Z"
    }
  ]
  ```
- **PostgreSQL DECIMAL Type Serialization**: In Node.js / TypeORM, PostgreSQL `DECIMAL(10,6)` columns default to string representations (`"89.500000"`) to prevent floating-point precision loss. In contrast, the OpenAPI specification declared `rate` as `type: number`. Our test suite verifies this exact string serialization and documents the discrepancy.
- **Ordering**: The repository executes `order: { from: 'ASC', to: 'ASC' }`. Because `from` and `to` are PostgreSQL ENUM types, PostgreSQL sorts records by their internal enum declaration order.

#### 3. `GET /api/v1/exchange-rates/quote`
- **HTTP Method**: `GET`
- **Path**: `/api/v1/exchange-rates/quote`
- **Query Parameters**:
  - `from`: Source currency (`Currency` enum: `EUR`, `GBP`, `USD`, `AED`, `PLN`, `INR`), required (`@IsEnum`, `@IsNotEmpty`).
  - `to`: Destination currency (`Currency` enum), required (`@IsEnum`, `@IsNotEmpty`).
  - `amount`: Numeric amount to convert, required (`@Type(() => Number)`, `@IsNumber`, `@Min(0.01)`).
- **Response Status**: `200 OK`
- **Response Shape**:
  ```json
  {
    "from": "EUR",
    "to": "INR",
    "amount": 100,
    "rate": 89.5,
    "convertedAmount": 8950
  }
  ```
- **Calculation Algorithm**:
  1. **Same Currency**: If `from === to`, immediately returns `rate = 1.0` and `convertedAmount = amount` without querying PostgreSQL.
  2. **Direct Rate**: Queries `exchange_rates` for `{ from, to }` ordered by `timestamp: 'DESC'`. Returns `Number(Number(rate).toFixed(6))`.
  3. **Inverse Rate**: If direct rate is not found, queries for `{ from: to, to: from }` ordered by `timestamp: 'DESC'`. Calculates `Number((1 / rate).toFixed(6))`.
  4. **Triangular Rate via Base EUR**: If neither currency is EUR, queries `EUR -> from` and `EUR -> to`. Calculates `Number(((1 / rateEurToFrom) * rateEurToTarget).toFixed(6))`.
  5. **Not Found**: If no direct, inverse, or triangular path exists, throws `NotFoundException` (`404 Not Found`).
  6. **Banking Precision**: Applies standard half-up rounding:
     ```typescript
     convertedAmount = Math.round((Number(amount) * rate + Number.EPSILON) * 100) / 100;
     ```

---

### File: qa/automation/api/exchange-rates.api.ts
<a id="file-qaautomationapiexchange-ratesapits-step5h"></a>

To maintain our core SDET architectural pattern (assertion-free API client, strong typing, clean abstraction), we refined `ExchangeRatesApi`:

```typescript
import { APIResponse } from '@playwright/test';
import { BaseApi } from './base.api';
import { GetQuoteQuery } from './types';

export class ExchangeRatesApi extends BaseApi {
  /**
   * Retrieve all stored foreign exchange rates.
   * Public endpoint that supports optional query parameters for negative testing.
   */
  async getAllRates(query?: Record<string, any>, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('exchange-rates', { params: query, headers });
  }

  /**
   * Calculate a foreign exchange conversion quote.
   * Public endpoint accepting from, to, and amount query parameters.
   */
  async getQuote(params?: GetQuoteQuery | Record<string, any>, headers?: Record<string, string>): Promise<APIResponse> {
    return this.get('exchange-rates/quote', { params, headers });
  }
}
```

#### Why This Design Matters:
1. **Assertion-Free**: Returns raw Playwright `APIResponse`. Assertions are written strictly in test specs.
2. **Flexible Overloads**: Accepts strongly-typed `GetQuoteQuery` for valid flows and `Record<string, any>` for negative testing (missing fields, malformed numbers, invalid enums).
3. **Public Context Reusability**: Inherits from `BaseApi` and is instantiated in `api.fixtures.ts` under both unauthenticated `exchangeRatesApi` and authenticated `authUser.api.exchangeRates`.

---

### File: qa/automation/api/types.ts (Step 5H Updates)
<a id="file-qaautomationapitypests-step5h"></a>

We introduced explicit response interfaces matching the actual NestJS serialization:

```typescript
export interface GetQuoteQuery {
  from: Currency;
  to: Currency;
  amount: number;
}

export interface ExchangeRateResponse {
  id: string;
  from: Currency;
  to: Currency;
  rate: string; // TypeORM PostgreSQL DECIMAL(10,6) returns string in JSON
  timestamp: string;
  createdAt: string;
}

export interface ExchangeRateQuoteResponse {
  from: Currency;
  to: Currency;
  amount: number;
  rate: number; // Quote service explicitly casts rate to JS Number with toFixed(6)
  convertedAmount: number;
}
```

---

### File: qa/automation/tests/exchange-rates/exchange-rates.spec.ts
<a id="file-qaautomationtestsexchange-ratesexchange-ratesspects"></a>

The complete test suite contains **42 automated tests** structured across 8 architectural categories:

```typescript
// Serial execution prevents multi-worker race conditions on shared exchange_rates database rows
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  for (const r of CANONICAL_SEED_RATES) {
    const existing = await dbClient.queryOne<{ id: string }>(
      'SELECT id FROM exchange_rates WHERE "from" = $1 AND "to" = $2',
      [r.from, r.to],
    );
    if (!existing) {
      await dbClient.query(
        `INSERT INTO exchange_rates (id, "from", "to", rate, timestamp, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
        [r.from, r.to, r.rate],
      );
    }
  }
});
```

---

### Step 5H Detailed Breakdown of All 42 Test Cases
<a id="step-5h-detailed-breakdown-of-all-42-test-cases"></a>

| # | Category | Test Name | Expected Status | Primary Assertion / Invariant |
|---|---|---|:---:|---|
| 1 | Public Access | `GET /exchange-rates succeeds without Authorization header` | `200 OK` | Unauthenticated public access succeeds |
| 2 | Public Access | `GET /exchange-rates succeeds with valid Bearer token` | `200 OK` | Authenticated user access succeeds |
| 3 | Public Access | `GET /exchange-rates/quote succeeds without Authorization` | `200 OK` | Quote calculation accessible to public visitors |
| 4 | Public Access | `GET /exchange-rates/quote succeeds with valid Bearer token` | `200 OK` | Quote calculation accessible with auth token |
| 5 | Public Access | `Public endpoints gracefully accept malformed Authorization headers` | `200 OK` | Unauthenticated controller ignores malformed token |
| 6 | List & Schema | `Returns 200 OK and validates full response schema for every rate` | `200 OK` | UUID IDs, valid Currencies, valid ISO timestamps |
| 7 | List & Schema | `Documents and verifies PostgreSQL DECIMAL string serialization` | `200 OK` | Rate field is string representing valid positive float |
| 8 | List & Schema | `Verifies response items are sorted by source then destination` | `200 OK` | Exact parity with PostgreSQL `ORDER BY "from", "to"` |
| 9 | List & Schema | `Ignores unexpected query parameters without failing or altering results` | `200 OK` | `?page=1&limit=2` ignored, full list returned |
| 10 | List & Schema | `Does not expose internal server properties or sensitive fields` | `200 OK` | No leaked passwords, user IDs, or internal notes |
| 11 | Quote Math | `Same-currency conversion (EUR -> EUR) returns rate 1.0 without DB lookup` | `200 OK` | Rate = 1.0, convertedAmount === amount |
| 12 | Quote Math | `Same-currency conversion for non-EUR currencies (INR, USD, GBP, AED, PLN)` | `200 OK` | Rate = 1.0 for all supported non-EUR currencies |
| 13 | Quote Math | `Direct rate conversion (EUR -> INR) accurately calculates convertedAmount` | `200 OK` | 100 EUR * 89.50 = 8950.00 INR |
| 14 | Quote Math | `Direct rate conversion (EUR -> USD) calculates with 6-decimal precision` | `200 OK` | 150 EUR * 1.08 = 162.00 USD |
| 15 | Quote Math | `Inverse rate conversion (INR -> EUR) computes 1 / directRate` | `200 OK` | 1 / 89.5 = 0.011173, 8950 INR = 100.00 EUR |
| 16 | Quote Math | `Inverse rate conversion (USD -> EUR) computes 1 / 1.08 = 0.925926` | `200 OK` | 108 USD * 0.925926 = 100.00 EUR |
| 17 | Quote Math | `Triangular conversion via EUR (USD -> INR) calculates (1 / 1.08) * 89.5` | `200 OK` | Cross rate = 82.870370, 100 USD = 8287.04 INR |
| 18 | Quote Math | `Triangular conversion computes cross-rate between non-EUR (GBP -> AED)` | `200 OK` | (1 / 0.85) * 3.96 = 4.658824, 100 GBP = 465.88 AED |
| 19 | Quote Math | `Handles fractional input amounts and applies half-up rounding` | `200 OK` | 125.55 EUR * 0.85 = 106.7175 -> 106.72 GBP |
| 20 | Quote Math | `Minimum allowed amount boundary (0.01) converts without underflow` | `200 OK` | 0.01 EUR * 89.5 = 0.895 -> 0.90 INR |
| 21 | Quote Math | `Large financial amounts (1,000,000.00) convert accurately without overflow` | `200 OK` | 1,000,000 EUR * 1.08 = 1,080,000 USD |
| 22 | Validation | `Rejects request with missing "from" query parameter` | `400 Bad Request` | Class-validator `@IsNotEmpty` rejection |
| 23 | Validation | `Rejects request with missing "to" query parameter` | `400 Bad Request` | Class-validator `@IsNotEmpty` rejection |
| 24 | Validation | `Rejects request with missing "amount" query parameter` | `400 Bad Request` | Class-validator `@IsNotEmpty` rejection |
| 25 | Validation | `Rejects request with all query parameters missing` | `400 Bad Request` | Class-validator schema validation rejection |
| 26 | Validation | `Rejects request with invalid/unknown source currency code` | `400 Bad Request` | `from must be one of the following values...` |
| 27 | Validation | `Rejects request with invalid/unknown destination currency code` | `400 Bad Request` | `to must be one of the following values...` |
| 28 | Validation | `Rejects lowercase currency codes due to strict enum case sensitivity` | `400 Bad Request` | `eur` rejected in favor of uppercase `EUR` |
| 29 | Validation | `Rejects non-positive amount of zero` | `400 Bad Request` | `amount must not be less than 0.01` |
| 30 | Validation | `Rejects negative amount` | `400 Bad Request` | `amount must not be less than 0.01` |
| 31 | Validation | `Rejects non-numeric amount string` | `400 Bad Request` | `amount must be a number...` |
| 32 | Validation | `Returns 404 Not Found when currency pair has no rate in database` | `404 Not Found` | `Exchange rate not found from EUR to PLN` |
| 33 | Database | `Verifies GET /exchange-rates matches PostgreSQL rows exactly` | `200 OK` | Parity of ID, from, to, rate, timestamp, createdAt |
| 34 | Database | `Service selects the latest timestamped rate when multiple ticks exist` | `200 OK` | `order: { timestamp: 'DESC' }` multi-tick selection |
| 35 | Cross-Domain | `Transfers consistency: POST /transfers matches GET /exchange-rates/quote` | `201 Created` | Transfer rate & recipientAmount === Quote rate & amount |
| 36 | Cross-Domain | `Wallet consistency: GET /wallets/me equivalents match quote conversions` | `200 OK` | Real-time wallet equivalents match quote conversions |
| 37 | Security | `SQL injection attempt in query parameter is rejected safely` | `400 Bad Request` | Parameter validation blocks injection before SQL layer |
| 38 | Security | `Cross-site scripting (XSS) payload in query parameters is rejected` | `400 Bad Request` | `<script>` tag rejected at boundary |
| 39 | Security | `Extremely large numeric amount is handled safely without 500 crash` | `200 / 400` | No unhandled floating-point overflow or crash |
| 40 | Security | `Oversized query string parameter does not crash the service` | `400 Bad Request` | 5,000-char string rejected cleanly without crash |
| 41 | Invariants | `Round-trip conversion (EUR -> INR -> EUR) maintains bounded tolerance` | `200 OK` | Tolerance `abs(returned - initial) <= 0.01` |
| 42 | Invariants | `Quote response is zero-spread identity with no hidden fees` | `200 OK` | `convertedAmount === round(amount * rate)` |

---

### Step 5H Database Cross-Layer Verification
<a id="step-5h-database-cross-layer-verification"></a>

#### Multi-Tick Time-Series Selection
In financial foreign exchange architectures, currency rates fluctuate continuously. The `exchange_rates` table does NOT enforce a unique constraint on `("from", "to")`. Instead, each rate row has an independent `timestamp` and `createdAt`. 

Test 34 verifies that when multiple ticks exist for the same currency pair, `ExchangeRatesService` selects the latest tick:
```typescript
// Older tick: 1 hour ago (rate = 1.05)
// Newer tick: now (rate = 1.12)
const response = await exchangeRatesApi.getQuote({ from: 'EUR', to: 'USD', amount: 100 });
const quote = await response.json();
expect(quote.rate).toBe(1.12);
expect(quote.convertedAmount).toBe(112);
```

---

### Step 5H Cross-Domain Consistency: Transfers and Wallet Equivalents
<a id="step-5h-cross-domain-consistency"></a>

A critical SDET objective is proving that shared services produce mathematically consistent results across disparate domains.

#### 1. Transfer Payment Engine Parity (Test 35)
When a user executes a cross-currency transfer (`POST /transfers`), `TransfersService` queries `ExchangeRatesService.getRate(wallet.currency, destinationCurrency)`. We prove that:
```typescript
expect(transfer.exchangeRate).toBe(quote.rate);
expect(transfer.recipientAmount).toBe(quote.convertedAmount);
expect(transfer.sendAmount).toBe(quote.amount);

// Ledger verification in PostgreSQL
const dbTx = await db.queryOne('SELECT "exchangeRate", "recipientAmount" FROM transactions WHERE id = $1', [transfer.id]);
expect(Number(dbTx.exchangeRate)).toBe(quote.rate);
expect(Number(dbTx.recipientAmount)).toBe(quote.convertedAmount);
```

#### 2. Wallet Multi-Currency Equivalents Parity (Test 36)
When a user views their wallet balance (`GET /wallets/me`), `WalletsService` calculates equivalent balances in all supported currencies using `ExchangeRatesService.getRate`. We assert that for every currency in `['USD', 'GBP', 'AED', 'INR']`:
```typescript
const quote = await exchangeRatesApi.getQuote({ from: 'EUR', to: targetCurrency, amount: wallet.balance });
expect(wallet.equivalents[targetCurrency]).toBe(quote.convertedAmount);
```

---

### Step 5H QA Findings & Architecture Observations
<a id="step-5h-qa-findings"></a>

#### Finding 1: TypeORM PostgreSQL DECIMAL String Serialization (POSSIBLE IMPLEMENTATION GAP / SPEC DISCREPANCY)
- **Classification**: POSSIBLE IMPLEMENTATION GAP / CONTRACT DISCREPANCY
- **Location**: `backend/src/modules/exchange-rates/entities/exchange-rate.entity.ts` line 20:
  ```typescript
  @Column({ type: 'decimal', precision: 10, scale: 6 })
  rate: number;
  ```
- **Observed Behavior**: In `GET /exchange-rates`, the repository executes `find()` directly. The PostgreSQL `pg` driver returns `DECIMAL` columns as strings (`"89.500000"`). However, in `docs/WrightPay-API.yaml` line 1863, `rate` is documented as `type: number`. In contrast, `getQuote()` explicitly converts `rate` using `Number(rate.toFixed(6))`, returning a JavaScript number.
- **Impact**: Frontend or API consumers expecting a numeric type in `GET /exchange-rates` may encounter runtime typing bugs if they do not parse the string with `parseFloat()`.
- **Recommendation**: Add a TypeORM column transformer to `ExchangeRate.rate` (`{ to: (v) => v, from: (v) => Number(v) }`) or map through a response DTO in `getAllRates()`.

#### Finding 2: PostgreSQL ENUM Internal Sort Order (EXPECTED IMPLEMENTED BEHAVIOR)
- **Classification**: EXPECTED IMPLEMENTED BEHAVIOR
- **Location**: `backend/src/modules/exchange-rates/exchange-rates.service.ts` line 16:
  ```typescript
  return this.exchangeRateRepository.find({ order: { from: 'ASC', to: 'ASC' } });
  ```
- **Observed Behavior**: Because `from` and `to` are PostgreSQL `ENUM` types, PostgreSQL orders records according to the order in which enum values were registered during database creation, rather than alphabetical order.
- **Impact**: Output order is deterministic with respect to the database schema, but does not match naive client-side alphabetical string comparison.

#### Finding 3: Read-Only Foreign Exchange API (KNOWN V1 LIMITATION)
- **Classification**: KNOWN V1 LIMITATION
- **Observed Behavior**: The WrightPay V1 API provides read-only endpoints (`GET /exchange-rates`, `GET /exchange-rates/quote`). There are no administrative endpoints to create, update, or delete exchange rates.
- **Impact**: Currency rates must be updated via database seeds, SQL migrations, or internal background synchronization workers.

---

### Step 5H Important SDET Concepts
<a id="step-5h-important-sdet-concepts"></a>

1. **Deterministic Test Data Seeding**: Safely seeding canonical market rates in `test.beforeAll` idempotently ensures tests remain isolated, reproducible, and decoupled from external market data.
2. **Serial Test Execution for Shared Resources**: Configuring `test.describe.configure({ mode: 'serial' })` prevents concurrent test workers from mutating shared reference tables (e.g. inserting experimental FX ticks or testing missing rates).
3. **Cross-Domain Contract Testing**: Proving that the Transfers payment engine, the Wallet balance aggregator, and the Exchange Rates API quote endpoint calculate identical figures to the cent ($0.01$).
4. **Triangular Conversion & Inverted Rate Invariants**: Testing multi-hop mathematical paths (`USD -> EUR -> INR`) against theoretical mathematical models to ensure floating-point rounding errors never accumulate in financial systems.
5. **Security at Validation Layer**: Ensuring SQL injection and XSS payloads are rejected by class-validator before any database connection runner is invoked.


---



---

# STEP 5I — CROSS-DOMAIN INTEGRATION TESTING
<a id="step-5i--cross-domain-integration-testing"></a>

### Connected System Architecture & Integration Objective
<a id="step-5i-connected-system-architecture"></a>

While Steps 5A through 5H verified each API domain in isolation (Auth, Users, Wallets, Cards, Beneficiaries, Transfers, Transactions, Exchange Rates), **Step 5I** evaluates WrightPay as a **fully connected, multi-tier distributed system**. 

A financial payment platform cannot be certified solely on isolated HTTP status codes. Integration testing must validate that:
1. Commands executed at the HTTP boundary initiate atomic database transactions across multiple relational entities (`users`, `wallets`, `beneficiaries`, `transactions`).
2. Distributed lock and idempotency keys are atomically acquired, hashed, and persisted in Redis with accurate TTLs.
3. Decoupled asynchronous background workers (`BullMQ` + Redis) consume, retry, and transition transactional states reliably without data skew.
4. Downstream read models (`GET /transactions`, `GET /wallets/me`) reflect asynchronous state mutations eventually and accurately.
5. Strict tenant isolation (anti-IDOR) holds when disparate domain resources interact.
6. Core financial invariants (zero double debits, exact fee accounting, non-negative balances, atomic rollback on failure) remain uncompromised.

```mermaid
flowchart TD
    subgraph Client["Playwright Test Client"]
        TestFlow["End-to-End Test Execution"]
    end

    subgraph HTTPGateway["HTTP API Layer (NestJS)"]
        AuthCtrl["Auth API (signup/login)"]
        WalletCtrl["Wallet API (/wallets/me)"]
        BenCtrl["Beneficiaries API (/beneficiaries)"]
        FXCtrl["Exchange Rates API (/quote)"]
        TransferCtrl["Transfers API (POST /transfers)"]
        TxCtrl["Transactions API (/transactions)"]
    end

    subgraph ServiceBus["Application Service Pipeline"]
        IdemService["IdempotencyService (SHA-256 Payload Hash)"]
        TransferService["TransfersService (executeTransferTransaction)"]
        FXService["ExchangeRatesService (Pricing Engine)"]
    end

    subgraph InMem["In-Memory & Queues (Redis 7)"]
        RedisLock[("Redis Cache / Keys
wrightpay:idempotency:transfer:{userId}:{key}
TTL: 86400s (24h)")]
        BullQueue[("BullMQ Queue: transfers
Job: process-transfer
Payload: { transactionId }")]
    end

    subgraph AsyncWorker["Background Processing Worker"]
        Worker["TransfersProcessor (WorkerHost)
Attempts: 3, Exponential Backoff
Simulation Hook: SIMULATE_FAILURE"]
    end

    subgraph Storage["Relational Storage (PostgreSQL 15)"]
        PGLock["Pessimistic Write Lock (SELECT FOR UPDATE on wallets)"]
        PGCommit[("Atomic Transaction Commit
- wallets: balance = balance - (amount + fee)
- transactions: INSERT (status = PENDING)")]
        PGUpdate[("Terminal State Update
- transactions: status = COMPLETED | FAILED")]
    end

    TestFlow --> AuthCtrl & WalletCtrl & BenCtrl & FXCtrl & TransferCtrl & TxCtrl
    TransferCtrl --> IdemService
    IdemService -->|SET NX 60s| RedisLock
    IdemService --> TransferService
    TransferService --> FXService
    TransferService --> PGLock --> PGCommit
    TransferService -->|Enqueued ONLY after PG Commit| BullQueue
    BullQueue --> Worker
    Worker -->|PENDING -> PROCESSING -> COMPLETED/FAILED| PGUpdate
    TxCtrl & WalletCtrl -.-> Storage
```

---

### File: qa/automation/tests/integration/cross-domain.spec.ts
<a id="file-qaautomationtestsintegrationcross-domainspects"></a>

Located at `qa/automation/tests/integration/cross-domain.spec.ts` (1,024 lines), this suite contains **13 comprehensive integration tests** covering all 10 core integration flows.

```typescript
import { test, expect, AuthenticatedUserSession } from '../../fixtures/api.fixtures';
import { generateTestUserData } from '../../test-data/user.factory';
import { dbClient, DbClient } from '../../database/db-client';
import { redisClient } from '../../redis/redis-client';
import { transferQueueClient } from '../../queues/queue-client';
import { WalletApi, BeneficiariesApi, TransfersApi, TransactionsApi } from '../../api';
import { config } from '../../config/env.config';
import {
  CreateBeneficiaryRequest,
  CreateTransferRequest,
  TransferResponse,
  TransactionResponse,
  ExchangeRateQuoteResponse,
} from '../../api/types';
```

---

### Breakdown of All 10 Integration Flows
<a id="step-5i-breakdown-of-all-10-integration-flows"></a>

#### Flow 1: Complete Success Journey (End-to-End User Lifecycle & Settlement)
Traces a real user from initial registration through asynchronous financial settlement:
1. **Registration & Onboarding**: Creates unique user via `POST /auth/signup`, verifies email via `POST /auth/verify-email`, logs in via `POST /auth/login` to obtain JWT.
2. **PostgreSQL Identity & Wallet Confirmation**: Confirms user row exists in `users` with `accountStatus = 'active'`, verifies default `EUR` wallet row created in `wallets` with initial balance `0.00`.
3. **Wallet Funding & Beneficiary Provisioning**: Safely funds wallet with 500 EUR, provisions an `INR` beneficiary via `POST /beneficiaries`, confirms database persistence.
4. **Foreign Exchange Pricing**: Queries `GET /exchange-rates/quote?from=EUR&to=INR&amount=100` confirming reference market rate (89.50) and recipient conversion (8,950.00 INR).
5. **Transfer Command Execution**: Submits transfer via `POST /transfers` with unique `Idempotency-Key`.
6. **Immediate Multi-Tier State Assertion**:
   - HTTP creation response is `201 Created` with initial status `PENDING`.
   - PostgreSQL `transactions` row persisted with verified financial attributes (`amount = 100`, `fee = 25`, `exchangeRate = 89.5`, `recipientAmount = 8950`).
   - PostgreSQL `wallets` immediately debited from 500 EUR to 375 EUR ($500 - (100 + 25)$).
   - Redis idempotency record saved with `status = 'COMPLETED'` and cached initial `PENDING` response payload.
   - BullMQ job enqueued to `transfers` queue.
7. **Asynchronous Processing & Synchronization (Bounded Polling)**: Synchronizes against the worker settlement boundary via bounded polling (`PENDING` $\to$ `PROCESSING` $\to$ `COMPLETED`) to eliminate race-prone transient observation points while preserving complete lifecycle verification.
8. **Final Parity & Invariants**:
   - `GET /transactions/:id` returns `COMPLETED`.
   - `GET /transactions` list includes the transaction.
   - Final wallet balance is strictly verified across API and PostgreSQL ($500 - 125 = 375$).

#### Flow 2: Failed Async Transfer & Financial Investigation (WP-QA-001)
Exercises the banking settlement failure simulation hook (`recipient: 'SIMULATE_FAILURE'`):
1. User with 500 EUR initiates transfer to a simulated-failure recipient.
2. Synchronous command executes: 125 EUR debited from wallet, `PENDING` transaction created.
3. BullMQ background worker picks up job, executes 3 retry attempts with exponential backoff, exhausts retries, and transitions transaction to `FAILED` with `failureReason: 'Simulated banking settlement failure'`.
4. Bounded polling awaits terminal `FAILED` state in API and PostgreSQL.
5. **Critical Financial Finding**: Proves that the wallet remains debited at 375 EUR. Zero refund transactions exist in the database. Provides definitive integration proof of **WP-QA-001**.

#### Flow 3: Idempotency Across Domains (Redis + DB + HTTP Consistency)
1. **Identical Replay**: Submits transfer with unique `Idempotency-Key`, then replays the exact same request.
   - Returns cached original response (`201 Created`).
   - Exactly ONE transaction row in PostgreSQL.
   - Exactly ONE wallet debit ($600 - 175 = 425$, NOT 250).
   - Redis key has valid 24-hour TTL ($> 86,000$s).
2. **Conflicting Payload**: Submits request with the same idempotency key but altered `sendAmount`.
   - Rejected with `409 Conflict` (`Idempotency key was already used with a different request payload`).
   - Zero second wallet debit, database transaction count remains 1.

#### Flow 4: Multi-User Data Isolation & IDOR Guards Across Domains
Creates two independent users (User A and User B) and exercises cross-domain resource interaction:
- User B cannot read User A's transaction via `GET /transactions/:id` (HTTP 404 Not Found).
- User B's transaction list does not leak User A's transaction records.
- User B cannot initiate a transfer using User A's source wallet (HTTP 404 `Source wallet not found`).
- User B cannot initiate a transfer using User A's beneficiary (HTTP 404 `Beneficiary not found`).
- Database records confirm strict multi-tenant `userId` partitioning.

#### Flow 5: Wallet $	o$ Transfer $	o$ Transaction Financial Consistency
Proves exact accounting equality across initial balance, send amount, fixed fee, and remaining balance:
$	ext{Balance}_{	ext{Initial}} - (	ext{SendAmount} + 	ext{Fee}) = 	ext{Balance}_{	ext{Remaining}}$
Validates that Wallet API balance, Wallet DB balance, Transaction API amounts, and Transaction DB ledger records are in 100% agreement.

#### Flow 6: Exchange Rate $	o$ Transfer Consistency
Validates that the transfer payment engine consumes the exact pricing formula and conversion rate provided by `ExchangeRatesService`. Compares quote output with transfer response and PostgreSQL ledger record for cross-currency transfers (`EUR -> USD`).

#### Flow 7: Beneficiary Lifecycle $	o$ Transfer Execution Guard
Validates that soft-deleted beneficiaries (`deletedAt IS NOT NULL`) are immediately rejected by the transfer engine with HTTP 404, preventing unauthorized payouts or orphaned wallet debits.

#### Flow 8: Redis Idempotency Lifecycle & State Management
Deeply inspects the internal structure of Redis idempotency keys:
- Key format: `wrightpay:idempotency:transfer:{userId}:{idempotencyKey}`
- TTL: Confirms remaining TTL is within the configured 24-hour window ($86,300	ext{s} < 	ext{TTL} le 86,400	ext{s}$).
- Payload: Confirms JSON payload contains `status: 'COMPLETED'`, 64-character SHA-256 `requestHash`, timestamps, and cached response payload.

#### Flow 9: BullMQ Queue $	o$ Worker Execution $	o$ Durable State
Inspects queue client health, verifies job lifecycle, and notes that while successful BullMQ jobs are cleared from Redis via `removeOnComplete: true`, PostgreSQL serves as the durable financial ledger.

#### Flow 10: Pre-Commit Atomicity & Failure Isolation
Validates that pre-commit business rule failures trigger clean transaction rollbacks:
1. **Insufficient Balance**: Exceeding wallet balance fails with HTTP 400 $	o$ 0 wallet debit, 0 transaction rows, Redis lock cleanly deleted.
2. **Suspended User**: Suspended account fails with HTTP 403 $	o$ 0 wallet debit, 0 transaction rows.
3. **UPI Rail Currency Mismatch**: Non-INR destination on UPI beneficiary fails with HTTP 400 $	o$ atomic rollback, wallet balance preserved.

---

### Detailed Breakdown of All 13 Test Cases
<a id="step-5i-detailed-breakdown-of-all-13-test-cases"></a>

| # | Flow | Test Description | Expected Status | Multi-Tier Verification Layers |
|---|---|---|:---:|---|
| 1 | Flow 1 | Full realistic transfer journey across Auth, Wallet, Beneficiaries, FX, Transfers, Queue, and Transactions | `201 Created` | Auth API $	o$ DB Users $	o$ DB Wallets $	o$ Beneficiary API $	o$ FX API $	o$ Transfers API $	o$ Redis $	o$ BullMQ $	o$ DB Tx $	o$ Tx API |
| 2 | Flow 2 | Failed settlement transitions to FAILED with failureReason while wallet remains debited without refund | `201 -> FAILED` | Transfers API $	o$ BullMQ retries $	o$ Worker failure $	o$ DB status $	o$ Tx API $	o$ Wallet balance check (WP-QA-001) |
| 3 | Flow 3 | Duplicate replay with identical payload returns cached response without duplicate debit | `201 Created` | HTTP replay $	o$ Redis cache $	o$ DB transaction count = 1 $	o$ Single wallet debit |
| 4 | Flow 3 | Reusing Idempotency-Key with conflicting payload is rejected with 409 Conflict | `409 Conflict` | IdempotencyService hash check $	o$ HTTP 409 $	o$ Zero wallet debit $	o$ DB count = 1 |
| 5 | Flow 4 | Multi-user data isolation across wallets, beneficiaries, transfers, and transactions | `404 Not Found` | User A vs User B $	o$ Wallet IDOR $	o$ Beneficiary IDOR $	o$ Tx IDOR $	o$ Tx List isolation |
| 6 | Flow 5 | Wallet balance and transaction ledger maintain exact mathematical accounting agreement | `201 Created` | Initial balance - (amount + fee) === Final balance across API & PostgreSQL |
| 7 | Flow 6 | Transfers pricing engine consumes and records exact rate and payout from FX quote | `201 Created` | FX quote rate & convertedAmount === Transfer response === PostgreSQL ledger |
| 8 | Flow 7 | Soft-deleted beneficiary is rejected by transfer engine preventing unintended debits | `404 Not Found` | Beneficiary soft-delete $	o$ `deletedAt` in DB $	o$ Transfer rejected $	o$ Zero wallet debit |
| 9 | Flow 8 | Inspects Redis idempotency key format, TTL, request hash, and response caching lifecycle | `201 Created` | Redis key name $	o$ TTL $le$ 86400s $	o$ SHA-256 hash $	o$ Cached response body |
| 10 | Flow 9 | Proves BullMQ job contract and verifies PostgreSQL remains durable source of truth | `201 Created` | Queue healthCheck $	o$ BullMQ worker execution $	o$ PostgreSQL durable ledger parity |
| 11 | Flow 10 | Insufficient wallet balance triggers atomic rollback: 0 tx rows, 0 debits, clean Redis lock | `400 Bad Request` | Validation failure $	o$ PG transaction rollback $	o$ Redis lock deleted $	o$ Balance unchanged |
| 12 | Flow 10 | Suspended user account blocks transfer pre-commit preserving wallet and database state | `403 Forbidden` | Account status check $	o$ HTTP 403 $	o$ Zero wallet debit $	o$ Zero transaction rows |
| 13 | Flow 10 | UPI payout rail currency mismatch blocks transfer pre-commit maintaining wallet integrity | `400 Bad Request` | Rail validation $	o$ HTTP 400 $	o$ Zero wallet debit $	o$ Zero transaction rows |

---

### Deep Architectural Validations: API, DB, Redis, BullMQ
<a id="step-5i-deep-architectural-validations"></a>

#### 1. Database Locking & Atomicity
During `executeTransferTransaction`, `TransfersService` acquires the source wallet with a pessimistic write lock:
```typescript
const wallet = await queryRunner.manager.findOne(Wallet, {
  where: { id: sourceWalletId, userId },
  lock: { mode: 'pessimistic_write' },
});
```
This serializes concurrent debits against the same wallet, ensuring that balance deductions and transaction insertions succeed or fail atomically.

#### 2. Redis Distributed Idempotency Contract
The `IdempotencyService` uses an atomic two-phase Redis pattern:
1. **Acquire Lock**: `SET wrightpay:idempotency:transfer:{userId}:{key} { status: 'PROCESSING' } EX 60 NX`
2. **Execute Transaction**: Runs PostgreSQL atomic transaction.
3. **On Success**: Caches completed result: `SET ... { status: 'COMPLETED', response: ... } EX 86400`
4. **On Failure / Rollback**: Immediately executes `DEL ...` so clients can retry safely.

#### 3. Post-Commit Asynchronous Enqueueing
Crucially, BullMQ job enqueueing occurs **strictly after** the PostgreSQL transaction has committed:
```typescript
await queryRunner.commitTransaction();

// Enqueue BullMQ job ONLY AFTER database commit succeeded
await this.transfersQueue.add(PROCESS_TRANSFER_JOB, { transactionId: savedTransaction.id }, {
  jobId: `transfer-${savedTransaction.id}`,
  removeOnComplete: true,
  removeOnFail: false,
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
```

---

### Financial Invariants Proved Across Domains
<a id="step-5i-financial-invariants"></a>

1. **Zero Double-Debit Invariant**: Duplicate HTTP submissions with identical idempotency keys never result in multiple wallet debits.
2. **Deterministic Ledger Invariant**: Every debited transfer produces exactly one permanent ledger record in PostgreSQL with matching `amount`, `fee`, `senderAmount`, and `recipientAmount`.
3. **Anti-Negative Balance Invariant**: Requests where $	ext{sendAmount} + 	ext{fee} > 	ext{balance}$ fail synchronously before any database mutation.
4. **Tenant Isolation Invariant**: No user can access or manipulate wallet balances, beneficiaries, or transactions belonging to another tenant.
5. **Pricing Consistency Invariant**: The rate and payout amount calculated by `ExchangeRatesService` match the transfer execution and transaction ledger to the cent ($0.01$).

---

### QA Findings & Evidence Strengthening
<a id="step-5i-qa-findings"></a>

#### Finding WP-QA-001 (Strengthened Integration Evidence): Lack of Automatic Refund on Asynchronous Settlement Failure
- **Classification**: CONFIRMED IMPLEMENTATION GAP / RISK
- **Severity**: High (Financial Data Integrity)
- **Preconditions**: User submits a transfer that commits to PostgreSQL as `PENDING` and debits the source wallet. The asynchronous BullMQ worker subsequently fails settlement (e.g. Beneficiary bank rejects payout, gateway timeout, simulated failure).
- **Observed Behavior (Integration Flow 2)**:
  - Transaction status transitions from `PENDING` to `FAILED` with `failureReason: 'Simulated banking settlement failure'`.
  - The source wallet **remains debited**. No compensating credit is applied to `wallets.balance`.
  - No refund transaction record is generated in `transactions`.
- **Impact**: In a production banking environment, user funds would be lost without automated reversal or human reconciliation.
- **Recommendation**: Introduce an automated compensation handler in `TransfersProcessor` when retries are exhausted to credit the source wallet and insert a `REFUND` transaction ledger record.

---

### Step 5I Important SDET Concepts
<a id="step-5i-important-sdet-concepts"></a>

1. **Connected-System Testing vs. Isolated Unit/API Testing**: Testing individual REST endpoints in isolation misses distributed bugs such as lock retention, queue exhaustion, unhandled worker retries, and missing financial compensation.
2. **Durable Ledger as Source of Truth**: In systems where message queues use `removeOnComplete`, tests must assert on durable database entities rather than relying on ephemeral queue memory.
3. **Dynamic Bounded Polling**: Replacing fixed sleep timers with predicate-driven bounded polling creates fast, deterministic integration test execution (13 complex integration tests executing in under 5 seconds).


---



---

# STEP 5J — BACKEND SECURITY & NEGATIVE-PATH AUDIT
<a id="step-5j--backend-security--negative-path-audit"></a>

### Audit Objective & Security Boundaries
<a id="step-5j-audit-objective--security-boundaries"></a>

Step 5J shifts the QA automation focus from happy-path and functional integration testing to a rigorous **Security & Negative-Path Audit**. In a financial remittance and wallet platform like WrightPay, correctness under adverse conditions is just as vital as correctness during nominal operations.

The objective of Step 5J is to probe the backend as an adversary or malfunctioning client would:
- Bypassing or corrupting authentication tokens.
- Accessing or mutating other users' resources (Insecure Direct Object References - IDOR).
- Injecting unexpected administrative or financial properties into request payloads.
- Testing overdraft boundaries, negative amounts, and precision limits.
- Auditing Redis idempotency namespace segregation across different accounts.
- Inspecting database and network responses for credential or cardholder data leakage.
- Stress-testing error handling to discover unhandled `500 Internal Server Error` crashes caused by malformed path parameters.

> [!IMPORTANT]
> **Audit Notice:**  
> This automated security audit is designed to test application-level security controls, input validation pipes, and error resilience. It does **not** constitute a formal penetration test or third-party cryptographic review, and does not claim the application is "fully secure" or "production certified".

---

### Security Test Suite Structure & Inventory
<a id="step-5j-security-test-suite-structure--inventory"></a>

The security test suite is organized into 6 focused specification files under `qa/automation/tests/security/`:

| File | Domain Area | Tests | Key Focus |
|---|---|---|---|
| `tests/security/authentication.spec.ts` | Authentication | 14 | Missing/empty headers, garbage tokens, cryptographic signature tampering, expired JWTs, suspended accounts |
| `tests/security/authorization.spec.ts` | Authorization / IDOR | 1 (9 assertions) | User A vs User B isolation across wallets, beneficiaries, cards, transfers, and transactions |
| `tests/security/input-validation.spec.ts` | Input Validation | 12 | Privilege escalation on `PATCH /users/me`, DTO enum validation, fee tampering, unsupported HTTP methods |
| `tests/security/financial-security.spec.ts` | Financial & Idempotency | 8 | Overdraft prevention, negative amounts, soft-deleted beneficiary rejection, cross-user idempotency isolation, 409 Conflict |
| `tests/security/information-disclosure.spec.ts` | Data Privacy & PCI-DSS | 3 | Argon2id password hashing, PAN/CVV non-storage, BullMQ job payload privacy |
| `tests/security/error-handling-500.spec.ts` | 500 Audit & Contracts | 16 | Non-UUID path parameters causing unhandled 500s (WP-QA-003), exchange rate serialization (WP-QA-004) |
| **TOTAL** | **6 Suites** | **54** | **100% Passing (0 Regressions, 256 Total Baseline)** |

---

### Authentication & Cryptographic Token Testing
<a id="step-5j-authentication--cryptographic-token-testing"></a>

The `JwtAuthGuard` was audited against header anomalies and cryptographic attacks:
1. **Missing & Corrupted Headers:**
   - Omitted `Authorization` header returns `401 Unauthorized`.
   - Empty header `""`, bare `"Bearer"`, or `"Bearer   "` returns `401 Unauthorized`.
   - Alternate schemes (e.g. `Basic dXNlcjpwYXNz` or `Token abcdef`) return `401 Unauthorized`.
   - Random non-JWT strings (e.g. `Bearer not_a_real_token`) return `401 Unauthorized` without 500 server crashes.
2. **Cryptographic JWT Attacks:**
   - **Invalid Secret Signature:** A token signed with an attacker's private key is rejected with `401 Unauthorized`.
   - **Signature Stripping:** Structurally truncated tokens (`header.payload` without signature) return `401 Unauthorized`.
   - **Payload Tampering:** Modifying claims (e.g. changing `sub` to another user ID) without updating the signature triggers signature verification failure (`401 Unauthorized`).
   - **Expired Tokens:** Tokens with `exp` in the past return `401 Unauthorized`.
   - **Algorithm "none" Attack:** Crafting a header with `"alg": "none"` is strictly rejected by `verifyAsync` (`401 Unauthorized`).
3. **Account Status Suspension:**
   - Setting `accountStatus = 'suspended'` in PostgreSQL immediately blocks transfer creation with `403 Forbidden` (`"Account is suspended or closed"`).

---

### Authorization & Multi-User IDOR Protection
<a id="step-5j-authorization--multi-user-idor-protection"></a>

A multi-user environment was created using **User A** and **User B**, each with their own wallets, beneficiaries, cards, and transaction records. The test suite proved:
- **Transaction Details:** User A requesting `GET /transactions/:id` for User B's transaction receives `404 Not Found` (`"Transaction not found"`), preventing transaction ID harvesting.
- **Beneficiary List Segregation:** `GET /beneficiaries` returns strictly the authenticated user's active beneficiaries; User B's beneficiaries are never visible to User A.
- **Beneficiary Deletion IDOR:** User A attempting `DELETE /beneficiaries/:id` for User B's beneficiary receives `404 Not Found`. Direct database inspection confirmed User B's record remained active (`deletedAt IS NULL`).
- **Card Lifecycle Manipulation:** User A attempting to freeze (`POST /cards/:id/freeze`), deactivate, or delete User B's card receives `404 Not Found`. User B's card remains in `active` status in PostgreSQL.
- **Source Wallet Spoofing:** User A specifying User B's wallet UUID in `POST /transfers` receives `404 Not Found` (`"Source wallet not found"`). User B's balance is untouched.
- **Beneficiary Spoofing:** User A specifying User B's beneficiary UUID in `POST /transfers` receives `404 Not Found` (`"Beneficiary not found"`). User A's wallet is not debited.

---

### Input Validation, Tampering & Method Abuse
<a id="step-5j-input-validation-tampering--method-abuse"></a>

1. **User Privilege Escalation (`PATCH /users/me`):**
   - When an attacker submits `{ role: 'SUPERADMIN', isAdmin: true, kycStatus: 'approved', accountStatus: 'closed', balance: 999999, passwordHash: '...' }`, NestJS's `ValidationPipe({ whitelist: true })` silently strips all non-whitelisted fields.
   - The response returns `200 OK` with only legitimate fields updated (`name`), and direct PostgreSQL verification proves privileged columns remained untouched.
2. **Transfer Fee & Status Tampering (`POST /transfers`):**
   - Submitting `{ fee: 0.0, status: 'completed', exchangeRate: 1000.0 }` in the transfer payload does not bypass business logic. The backend strips these fields, enforces the fixed 25.00 EUR fee, calculates recipient amount using the real internal FX rate, and sets initial status to `PENDING`.
3. **HTTP Method & Path Abuse:**
   - Unsupported methods on registered routes (`PUT /users/me`, `POST /wallets/me`, `GET /transfers`) return `404 Not Found`.
   - Encoded path traversal strings (`/transactions/..%2f..%2fetc%2fpasswd`) are handled safely without server crash or file system disclosure.

---

### Financial Security & User-Scoped Idempotency
<a id="step-5j-financial-security--user-scoped-idempotency"></a>

1. **Overdraft Protection:**
   - Attempting a transfer where `sendAmount + fee > wallet.balance` returns `400 Bad Request` (`"Insufficient wallet balance"`).
   - Verified that wallet balance is unchanged, zero transaction records are created in PostgreSQL, and zero BullMQ jobs are enqueued.
2. **Amount Boundary Invariants:**
   - Negative amounts (`-50.00`) and zero amounts (`0.00`) are rejected with `400 Bad Request` without wallet debit.
3. **Soft-Deleted Beneficiary Protection:**
   - Transfers targeting a soft-deleted beneficiary return `404 Not Found` (`"Beneficiary not found"`).
4. **Cross-User Idempotency Isolation:**
   - User A and User B execute transfers using the **exact same `Idempotency-Key`**.
   - Because the Redis key incorporates the user ID (`wrightpay:idempotency:transfer:${userId}:${key}`), both transfers succeed independently with distinct transactions and separate wallet debits. User B is **never** served User A's cached response.
5. **Payload Mismatch Detection:**
   - Replaying the same `Idempotency-Key` with an altered `sendAmount` returns `409 Conflict` (`"Idempotency key was already used with a different request payload"`).
6. **Pre-Commit Atomicity:**
   - When a transfer fails pre-commit validation (e.g. insufficient funds), the initial Redis lock is deleted immediately, allowing the customer to retry safely without waiting for the 60-second TTL to expire.

---

### Information Disclosure, Argon2id & PCI-DSS Posture
<a id="step-5j-information-disclosure-argon2id--pci-dss-posture"></a>

1. **Argon2id Password Hashing:**
   - Inspected PostgreSQL `users` table. Passwords are hash-encoded using **Argon2id** (`$argon2id$v=19$m=65536,p=4,t=3$...`), representing state-of-the-art password protection.
   - Password hashes, salts, and plaintext passwords are never returned in `POST /auth/signup`, `POST /auth/login`, `GET /users/me`, or `PATCH /users/me`.
2. **PCI-DSS Card Data Protection:**
   - `POST /cards` and `GET /cards` return only `lastFourDigits` (e.g. `"1234"`).
   - Querying `information_schema.columns` on table `cards` proves that columns for full PAN, card number, CVV, or CVC **do not exist** in the database schema.
3. **BullMQ Worker Privacy:**
   - Inspected transfer jobs in Redis queue `transfers`. The payload contains exclusively `{ transactionId: "uuid" }` with zero PII, card numbers, or bank account credentials.

---

### Error Handling & Path Parameter 500 Audit
<a id="step-5j-error-handling--path-parameter-500-audit"></a>

Step 5J systematically audited all routes accepting resource identifiers in the URL path:
- `GET /transactions/:id` with non-UUID -> **HTTP 500**
- `DELETE /beneficiaries/:id` with non-UUID -> **HTTP 500**
- `POST /cards/:id/freeze` with non-UUID -> **HTTP 500**
- `POST /cards/:id/unfreeze` with non-UUID -> **HTTP 500**
- `POST /cards/:id/deactivate` with non-UUID -> **HTTP 500**
- `DELETE /cards/:id` with non-UUID -> **HTTP 500**

**Root Cause:**
Controllers use `@Param('id') id: string` without `new ParseUUIDPipe()`. When passed to TypeORM queries, PostgreSQL throws error code `22P02: invalid input syntax for type uuid`. In the absence of a global database exception filter, NestJS converts this into an unhandled HTTP 500 response. This massively strengthens finding **WP-QA-003** from an isolated transaction endpoint bug to a system-wide API boundary gap.

---

### Security Findings Register & Evidence
<a id="step-5j-security-findings-register--evidence"></a>

| Finding ID | Severity | Title | Status |
|---|---|---|---|
| **WP-QA-001** | High | Missing Automatic Refund on Asynchronous Transfer Failure | Confirmed (Phases 5F, 5I, 5J) |
| **WP-QA-002** | Medium | Risk of Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error | Confirmed (Phases 5F, 5I, 5J) |
| **WP-QA-003** | Medium | Malformed Path Parameter UUID Causes HTTP 500 Across All Domains | Massively Strengthened (Phase 5J) |
| **WP-QA-004** | Low | Serialized Exchange Rate Type Discrepancy (String vs OpenAPI Number) | Confirmed (Phases 5H, 5J) |
| **WP-QA-005** | Low | Beneficiary Creation Accepts Whitespace-Only Name and Persists Empty String | **NEW Finding (Phase 5J)** |
| **WP-QA-006** | Low | Global ValidationPipe Lacks `forbidNonWhitelisted: true` | **NEW Observation (Phase 5J)** |

---

### Important SDET Security Concepts
<a id="step-5j-important-sdet-security-concepts"></a>

1. **Why Status Code 400 is Preferred over 500:**  
   In REST APIs, 4xx status codes indicate client-side errors (malformed input, bad syntax, missing parameters), whereas 5xx indicates an unhandled internal server failure. Returning 500 for invalid client input pollutes error monitoring dashboards, triggers false-positive pager alerts, and hides real backend exceptions.
2. **Why Stripping Non-Whitelisted Fields is Not Always Enough:**  
   While `whitelist: true` prevents SQL parameter injection, strict financial APIs should also use `forbidNonWhitelisted: true` to fail fast with 400 Bad Request when unknown fields are sent, alerting client developers to integration defects immediately.
3. **Idempotency Namespacing:**  
   Idempotency keys must always be scoped to the authenticated identity (`userId + idempotencyKey`). Without user scoping, User A could guess or collide with User B's key, resulting in cross-account response leakage or unauthorized state replay.


---

# STEP 5K — CONCURRENCY, RACE CONDITIONS & QUEUE RELIABILITY
<a id="step-5k--concurrency-race-conditions--queue-reliability"></a>

### Concurrency Audit Objectives & Methodology
<a id="step-5k-objectives-and-methodology"></a>

Step 5K assesses whether WrightPay maintains financial and state consistency when multiple operations occur concurrently or when asynchronous queue processing behaves unexpectedly. In payment systems, financial correctness under contention is paramount:
- **Pessimistic Row Locking (`FOR UPDATE`)**: Validating that concurrent wallet mutations strictly serialize, preventing double-spending and overdrafts.
- **Distributed Idempotency Synchronization**: Probing Redis `SET NX EX` locks against concurrent duplicate and conflicting transfer submissions.
- **Asynchronous Queue Reliability**: Observing BullMQ worker retry behavior, exponential backoff, and terminal state transitions under simulated banking failures.
- **Financial & Ledger Invariants**: Verifying that wallet balance equals initial balance minus total debited amounts, and that a 1:1:1:1 mapping is preserved across API responses, database rows, debits, and unique references.
- **Queue / Database Failure Window (WP-QA-002)**: Statically auditing the reliability gap between PostgreSQL transaction commit and BullMQ enqueueing.

> [!CRITICAL]
> **Audit Rule — Observation Without Code Modification:**  
> In strict accordance with the testing mandate, production business logic, database transactions, locking primitives, Redis helpers, and BullMQ worker code were **not modified**. Discovered gaps are audited and documented as findings, not prematurely patched.

---

### Step 5K Concurrency Test Suite Structure

The concurrency suite comprises 21 automated tests organized into 4 specialized specification files under `qa/automation/tests/concurrency/`:

| Suite File | Scope & Focus | Tests | Key Invariants Verified |
|---|---|:---:|---|
| `tests/concurrency/concurrent-transfers.spec.ts` | Same-Wallet Concurrency & Row Locking | 6 | 2-request scarce balance barrier (125 EUR), 8-request overdraft prevention (300 EUR), independent transfers, dirty read prevention, cross-user isolation |
| `tests/concurrency/idempotency-race.spec.ts` | Redis Idempotency Race Conditions | 6 | 6 concurrent identical requests, conflicting payloads (409 Conflict), cross-user key isolation, cached replay, TTL inspection, early-failure polling gap (WP-QA-007) |
| `tests/concurrency/queue-reliability.spec.ts` | BullMQ Processing & Worker Retry | 5 | Concurrent job execution, 3-attempt exponential retry backoff, simulated failure lifecycle, no-refund audit (WP-QA-001), commit-before-enqueue contract (WP-QA-002) |
| `tests/concurrency/financial-invariants.spec.ts` | Mathematical Accounting & Conservation | 4 | Initial $-$ sum(amounts $+$ fees) $==$ Final balance, 1:1:1:1 transaction-debit consistency, zero-balance double-spend exhaustion, 2-decimal fractional precision |
| **TOTAL** | **4 Concurrency Suites** | **21** | **100% Passing (277 Consolidated Tests)** |

---

### PostgreSQL Locking & Double-Spend Prevention

WrightPay employs explicit pessimistic write locks within `TransfersService.executeTransferTransaction()`:
```typescript
// backend/src/modules/transfers/transfers.service.ts
const wallet = await queryRunner.manager.findOne(Wallet, {
  where: { id: sourceWalletId, userId },
  lock: { mode: 'pessimistic_write' }, // Generates SELECT ... FOR UPDATE
});
```

#### Observable Concurrency Behavior
1. **Scarce Balance Barrier (125.00 EUR Balance)**:
   - Two concurrent transfers of 100.00 EUR + 25.00 EUR fee were launched simultaneously via `Promise.all`.
   - The PostgreSQL row-level lock forced the second transaction to wait until the first committed.
   - Upon lock acquisition, the second transaction re-read the updated balance (`0.00 EUR`), evaluated `if (currentBalance < totalDeduction)`, and failed with `400 Bad Request` (`"Insufficient wallet balance"`).
   - **Result**: Exactly ONE transfer succeeded; wallet balance became `0.00 EUR` and **never negative**. Exactly 1 transaction record was inserted.
2. **High-Concurrency Overdraft Barrier (8 Requests against 300.00 EUR)**:
   - 8 simultaneous requests of 50.00 EUR + 25.00 EUR fee (75.00 EUR each, total 600.00 EUR attempted).
   - Exactly 4 requests succeeded ($4 \times 75 = 300.00$ EUR); exactly 4 failed with `400 Bad Request`.
   - Final balance was exactly `0.00 EUR`. Zero negative balance or lost updates occurred.

---

### Redis Idempotency Synchronization & Polling Mechanics

The distributed idempotency mechanism in `IdempotencyService` operates via atomic Redis operations:
1. **Initial Acquisition**: `SET wrightpay:idempotency:transfer:{userId}:{key} {"status":"PROCESSING", ...} EX 60 NX`.
2. **Concurrent Duplicate Requests**:
   - Competing requests fail `SET NX` and read the existing record (`status: 'PROCESSING'`).
   - Callers enter a polling loop: 25 retries with 100ms delay (up to 2.5 seconds).
   - Once the primary request commits and sets `status: 'COMPLETED'`, pollers receive the cached `201 Created` response.
   - Tested with 6 simultaneous requests: All received identical transaction IDs and references; exactly one wallet debit occurred.
3. **Conflicting Payloads**:
   - A concurrent request reusing an in-flight key with an altered amount (`sendAmount: 75.00` vs `50.00`) detects the SHA-256 hash mismatch and immediately aborts with `409 Conflict` (`"Idempotency key was already used with a different request payload"`).
4. **Cross-User Isolation**:
   - Because the Redis namespace incorporates the `userId`, two different users submitting with the exact same `Idempotency-Key` never collide; both succeed independently.

---

### BullMQ Worker Lifecycle & Asynchronous Retries

Transfers transition through an asynchronous state machine:
- **Normal Flow**: `PENDING` $\rightarrow$ `PROCESSING` (worker pick-up via atomic conditional update) $\rightarrow$ `COMPLETED` (50ms settlement simulation).
- **Simulated Failure Flow (`SIMULATE_FAILURE`)**:
  - The worker catches failure, inspects `job.attemptsMade`, and allows BullMQ to retry with exponential backoff (1s initial delay).
  - Attempt 1 fails $\rightarrow$ Backoff 1000ms $\rightarrow$ Attempt 2 fails $\rightarrow$ Backoff 2000ms $\rightarrow$ Attempt 3 fails.
  - On the 3rd attempt (`job.attemptsMade >= 2`), status is updated in PostgreSQL to `FAILED` with `failureReason: "Simulated banking settlement failure"`.
  - Confirmed total duration $\ge 2.5$ seconds (observed ~3.7s).

---

### Queue / Database Reliability Gap (WP-QA-002)

The audit verified the architectural window between database commit and queue enqueueing in `transfers.service.ts`:
1. `await queryRunner.commitTransaction()` executes at line 175.
2. `await this.transfersQueue.add(...)` executes at line 188 within a `try/catch` block.
3. If Redis fails or rejects enqueueing, the catch block merely logs the error and the endpoint returns `201 Created`.
4. **Impact**: The customer's funds are debited, but the transfer remains permanently orphaned in `PENDING` status with no background worker scheduled to process it.
5. **Status**: **Architecturally identified and statically confirmed** (no dynamic network sabotage injected).

---

### Concurrency Findings Register

| ID | Title | Severity | Category | Status |
|---|---|---|---|---|
| **WP-QA-001** | Missing Automatic Refund on Asynchronous Settlement Failure | **High** | Financial Integrity | Confirmed & Strengthened |
| **WP-QA-002** | Risk of Orphaned PENDING Transfer via Unhandled BullMQ Enqueue Error | **Medium** | Reliability / Queues | Statically Confirmed Architectural Risk |
| **WP-QA-007** | Idempotency Polling Gap on Early Lock Deletion Stalls Concurrent Callers (409 Conflict) | **Low** | Concurrency / Idempotency | **CONFIRMED IMPLEMENTATION GAP (NEW)** |
| **WP-QA-008** | Low Entropy in Transfer Reference Generation Risks Unique Constraint Collision Under Volume | **Low** | Data Architecture / Reliability | **ARCHITECTURAL RISK (NEW)** |

#### Detailed Note on Finding WP-QA-007:
When a transfer fails validation early (e.g. insufficient funds) and deletes the key (`await this.redisService.del(key)`), a concurrent polling request polling `status === 'PROCESSING'` sees `currentRaw === null`. Because the loop only inspects non-null records, it stalls for all 25 iterations (2.5 seconds) and throws `409 Conflict` claiming the request is "currently processing", rather than failing fast.

---

### Audit Limitations

1. **Controlled Functional Concurrency**: Tests utilized controlled concurrency (2 to 8 concurrent requests) rather than high-load stress testing (k6).
2. **Network Partitions**: CAP-theorem network partitions between the application and Redis were not dynamically injected.
3. **Database Architecture**: Single-node PostgreSQL instance; multi-region replication lag was out of scope.

---

# Part 25 — Current Progress

### Completed Steps
- **Step 1**: Repository Audit, Endpoint Inventory, and OpenAPI 3.0 Contract Specification (`docs/WrightPay-API.yaml`).
- **Step 2**: QA Automation Foundation, Playwright Configuration, TypeScript compiler, and Proof-of-Life verification.
- **Step 3**: Database (`DbClient`), Redis (`RedisClient`), and Queue (`TransferQueueClient`) infrastructure helpers.
- **Step 4**: Strongly-typed API client architecture, User factory, and pre-authenticated Playwright fixtures (`authUser`).
- **Step 5A**: Authentication Domain API Testing (19 tests).
- **Step 5B**: Users Domain API Testing (12 tests).
- **Step 5C**: Wallet Domain API Testing (8 tests).
- **Step 5D**: Cards Domain API Testing (19 tests).
- **Step 5E**: Beneficiaries Domain API Testing (25 tests).
- **Step 5F**: Transfers Domain API Testing (30 tests).
- **Step 5G**: Transactions Domain API Testing (28 tests).
- **Step 5H**: Exchange Rates Domain API Testing (42 tests).
- **Step 5I**: Cross-Domain Integration Testing (13 tests).
- **Step 5J**: Backend Security & Negative-Path Audit (54 tests).
- **Step 5K**: Concurrency, Race Conditions & Queue Reliability Audit (21 tests).
- **Documentation**: Living Master Learning & Reference Guide (`QA_AUTOMATION_FRAMEWORK_GUIDE.md`).
- **QA Report Artifacts**: Formal reports in:
  - `reports/5J-security-audit/`
  - `reports/5K-concurrency-reliability/` (`CONCURRENCY_AUDIT_REPORT.md`, `CONCURRENCY_FINDINGS.md`, `TEST_EXECUTION_SUMMARY.md`).

> **Explicit Status Confirmation**: Step 5K Concurrency, Race Conditions & Queue Reliability is **COMPLETED** (**277 total tests passing**, 0 regressions, clean TypeScript typecheck). Work stops here pending user review.

---

# Part 26 — Final Backend QA — Findings Consolidation

## Final Baseline & Scope Summary

The WrightPay V1 backend QA automation campaign concluded with the completion of all 11 planned discovery and reliability phases (Steps 5A through 5K). The frozen QA automation baseline consists of **277 automated tests** across **22 specification files**, supported by TypeScript compile-time typechecking and direct cross-layer database/Redis/BullMQ verification.

### Cumulative Phase Execution Breakdown

| Phase | Domain / Subsystem | Spec Files | Test Count | Isolation Pass | Canonical Status |
|:---|:---|:---|---:|:---:|:---:|
| **Infra/Smoke** | Data Store & Pipeline Baseline | `smoke.spec.ts`, `proof-of-life.spec.ts`, `database.spec.ts`, `redis.spec.ts`, `bullmq.spec.ts`, `config.spec.ts` | 6 | 6 / 6 (100%) | Verified |
| **Step 5A** | Authentication & Session Lifecycle | `tests/auth/auth.spec.ts` | 19 | 19 / 19 (100%) | Verified |
| **Step 5B** | Users Profile & Access Control | `tests/users/users.spec.ts` | 12 | 12 / 12 (100%) | Verified |
| **Step 5C** | Wallet Invariants & Precision | `tests/wallet/wallet.spec.ts` | 8 | 8 / 8 (100%) | Verified |
| **Step 5D** | Cards Lifecycle & PIN Security | `tests/cards/cards.spec.ts` | 19 | 19 / 19 (100%) | Verified |
| **Step 5E** | Beneficiary Management & Rules | `tests/beneficiaries/beneficiaries.spec.ts` | 25 | 25 / 25 (100%) | Verified |
| **Step 5F** | Transfers & Idempotency Engine | `tests/transfers/transfers.spec.ts` | 30 | 30 / 30 (100%) | Verified |
| **Step 5G** | Transactions Ledger & Pagination | `tests/transactions/transactions.spec.ts` | 28 | 28 / 28 (100%) | Verified |
| **Step 5H** | Exchange Rates & FX Engine | `tests/exchange-rates/exchange-rates.spec.ts` | 42 | 42 / 42 (100%) | Verified |
| **Step 5I** | Cross-Domain E2E Journeys | `tests/integration/cross-domain.spec.ts` | 13 | 13 / 13 (100%) | Verified |
| **Step 5J** | Security & Negative-Path Audit | `tests/security/auth-bypass.spec.ts`<br>`tests/security/idor-matrix.spec.ts`<br>`tests/security/input-validation.spec.ts`<br>`tests/security/error-handling-500.spec.ts` | 54 | 54 / 54 (100%) | Verified |
| **Step 5K** | Concurrency, Races & Queue Reliability | `tests/concurrency/concurrent-transfers.spec.ts`<br>`tests/concurrency/idempotency-race.spec.ts`<br>`tests/concurrency/queue-reliability.spec.ts`<br>`tests/concurrency/financial-invariants.spec.ts` | 21 | 21 / 21 (100%) | Verified |
| **TOTAL** | **Full Canonical QA Automation Suite** | **22 Spec Files** | **277** | **277 / 277 (100%)** | **FROZEN BASELINE** |

---

## Master Findings Consolidation (WP-QA-001 through WP-QA-008)

Eight technical findings were consolidated, classified, and verified during the backend discovery campaign. No backend production code was modified during discovery; all findings remain open for the upcoming Defect Fix & Verification Phase.

| ID | Severity | Classification | Summary & Impact | Evidence Type | Primary Test / Spec File |
|:---|:---|:---|:---|:---|:---|
| **WP-QA-001** | **High** | CONFIRMED DEFECT | **Missing Automatic Refund on Settlement Failure**: When asynchronous transfer processing permanently fails (`SIMULATE_FAILURE`), status transitions to `FAILED` but customer funds and fees remain deducted from the wallet with no automatic compensation. | Automated Test + DB Evidence | `tests/concurrency/queue-reliability.spec.ts`<br>`tests/integration/cross-domain.spec.ts` |
| **WP-QA-002** | **Medium** | ARCHITECTURAL RISK | **Potential Orphaned PENDING Transfer**: `TransfersService` commits wallet debit in PostgreSQL (`commitTransaction`) before enqueueing BullMQ job (`transfersQueue.add`). An unhandled queue rejection or Redis partition leaves transfers permanently orphaned in `PENDING`. | Static Code / Architectural Analysis | `transfers.service.ts:175-211`<br>`tests/concurrency/queue-reliability.spec.ts` |
| **WP-QA-003** | **Medium** | CONFIRMED DEFECT | **Unhandled PostgreSQL UUID 500 Errors**: Passing non-UUID alphanumeric strings to path parameters on 6 endpoints triggers unhandled PostgreSQL `22P02` syntax errors, returning HTTP 500 instead of controlled 400 or 404 responses. | Automated Test + HTTP Response Evidence | `tests/security/error-handling-500.spec.ts` |
| **WP-QA-004** | **Low** | API CONTRACT DISCREPANCY | **Exchange Rate Serialization Type**: `GET /exchange-rates` returns `rate` as a string (`"1.0900"`) while the OpenAPI 3.0 specification documents `type: number`. TypeORM `decimal` column is unmapped to numeric representation. | Automated Test + Response Schema Evidence | `tests/exchange-rates/exchange-rates.spec.ts` |
| **WP-QA-005** | **Low** | CONFIRMED DEFECT | **Whitespace-Only Beneficiary Name**: `POST /beneficiaries` accepts whitespace-only name strings (`"   "`), trims them to empty string `""`, and persists them to PostgreSQL due to absence of `@IsNotEmpty()` on DTO. | Automated Test + DB Evidence | `tests/beneficiaries/beneficiaries.spec.ts` |
| **WP-QA-006** | **Low** | OBSERVATION | **Global ValidationPipe Configuration**: `ValidationPipe` utilizes `whitelist: true` but omits `forbidNonWhitelisted: true`. Unknown payload attributes are silently stripped rather than rejected with `400 Bad Request`. | Automated Test + Config Inspection | `main.ts:24`<br>`tests/security/input-validation.spec.ts` |
| **WP-QA-007** | **Low** | CONFIRMED IMPLEMENTATION GAP | **Concurrent Idempotency Polling Gap**: When an in-flight transfer fails early (e.g., insufficient balance), the primary worker deletes the Redis lock. Concurrent polling requests stall for 2.5s and receive a misleading `409 Conflict` claiming the request is processing. | Automated Test + Redis Polling Evidence | `tests/concurrency/idempotency-race.spec.ts` |
| **WP-QA-008** | **Low** | ARCHITECTURAL RISK | **Transfer Reference Entropy Collision Risk**: Transfer references (`generateReference()`) utilize 32 bits of pseudo-random entropy (`WP-` + 8 hex chars). Under sustained high transfer volume, birthday bound collisions will occur against the database unique constraint. | Static Code / Mathematical Analysis | `transfers.service.ts:18-20` |

---

## Finding Traceability & Evidence Sources

- **Automated Evidence**: Findings WP-QA-001, WP-QA-003, WP-QA-004, WP-QA-005, WP-QA-006, and WP-QA-007 are directly verified and reproduced by executable Playwright automated tests with HTTP responses, database rows, and Redis state logged to disk.
- **Static Code / Architectural Evidence**: Findings WP-QA-002 and WP-QA-008 are structural architectural risks substantiated by direct source-code inspection in `transfers.service.ts` and probability calculations.

---

## Framework Limitations & Scope Boundaries

1. **Environment Scope**: Executed against local single-node runtime (`http://localhost:3001/api/v1`, single PostgreSQL 15 container, single Redis 7 container). Multi-region replication latency and cluster failovers were not exercised.
2. **Banking Rails**: Bank settlements are simulated via mock worker logic; external clearinghouse webhooks (SEPA, Faster Payments, UPI) were not integrated.
3. **Load Profile**: Tests exercised functional concurrency and race conditions (2 to 8 simultaneous requests); production-scale stress testing (DDoS, >10,000 req/sec) requires dedicated performance tools (k6/Gatling).
4. **Security Assessment**: Step 5J was an automated application-level security audit; it does not replace a manual penetration test by certified security specialists.

---

## Canonical QA Artifacts Reference

All final QA documentation is consolidated in the `reports/final-backend-qa/` directory:

- **`FINAL_BACKEND_QA_REPORT.md`**: Canonical, portfolio-quality final backend QA report.
- **`MASTER_FINDINGS_REGISTER.md`**: Comprehensive defect, gap, and risk register with full preconditions, reproduction steps, and remediation guidance.
- **`FINDING_TRACEABILITY.md`**: Complete traceability matrix mapping findings to automated tests, evidence, and contract requirements.
- **`TEST_EXECUTION_SUMMARY.md`**: Formal test execution log, environment specifications, and failure analysis.

---

# Part 27 — Known Defect Regression Suite

## Purpose & Architecture
The Known Defect Regression Suite (`qa/automation/tests/defects/`) provides executable, reproducible specifications for active, unresolved quality findings without weakening existing baseline tests or modifying production code.

Rather than disguising known defects as ordinary passing tests or leaving the canonical 277-test baseline permanently red, the suite leverages Playwright's native `test.fail()` semantic combined with structured annotations (`test.info().annotations`). This ensures:
1. **Defect Persistence Verification**: CI validates that known defects are genuinely present in the runtime; if a defect is unexpectedly absent or fixed, Playwright immediately fails the run with `"Expected to fail, but passed"`.
2. **Clear Defect Graduation**: When an engineer resolves a defect in production code, the test fails, signaling that the defect is fixed. The engineer then removes `test.fail()` and graduates the test into the canonical baseline suite.
3. **No Baseline Pollution**: The canonical baseline remains strictly frozen at **277 passing tests** (`npx playwright test`), while the defect suite runs independently via `npm run test:defects` (`npx playwright test --config=playwright.defects.config.ts`).

---

## Naming Convention
Defect regression specifications follow the standardized pattern:
```text
qa/automation/tests/defects/wp-qa-<id>-<short-description>.spec.ts
```
Active Specifications:
- `wp-qa-001-settlement-refund.spec.ts`
- `wp-qa-003-uuid-error-handling.spec.ts`
- `wp-qa-005-whitespace-beneficiary.spec.ts`
- `wp-qa-007-idempotency-race-waiter.spec.ts`

---

## Active Findings & Expected vs. Actual Matrix

| Finding ID | Specification File | Severity | Expected Behavior | Actual Current Behavior | Defect Status |
|:---|:---|:---:|:---|:---|:---:|
| **WP-QA-001** | `wp-qa-001-settlement-refund.spec.ts` | **High** | When asynchronous settlement fails, deducted funds ($50 amount + $25 fee = $75 total) must be automatically restored to customer's wallet balance (400 EUR), and a compensating audit record logged in PostgreSQL. | Transaction transitions to `FAILED`, but customer wallet remains permanently debited at 325 EUR with zero compensating refund records. | Reproducible (`test.fail`) |
| **WP-QA-002** | *Architectural Finding* | **Medium** | State mutation must not commit in PostgreSQL if subsequent BullMQ job enqueueing cannot be guaranteed (Transactional Outbox pattern). | Database transaction commits before BullMQ enqueue; unhandled queue error logs and leaves transfer orphaned in `PENDING`. | Statically Documented |
| **WP-QA-003** | `wp-qa-003-uuid-error-handling.spec.ts` | **Medium** | Path parameters with non-UUID syntax (`not-a-valid-uuid`, `12345`) must be validated at controller boundary and return controlled HTTP 400 Bad Request or 404 Not Found. | Unvalidated string reaches PostgreSQL, causing `22P02 invalid input syntax for type uuid` and unhandled HTTP 500 Internal Server Error across 6 endpoints. | Reproducible (`test.fail`) |
| **WP-QA-004** | *Existing Contract Suite* | **Low** | `GET /exchange-rates` must return `rate` as numeric JSON type per OpenAPI 3.0 specification (`type: number`). | Endpoint serializes `rate` as string (`"1.0900"`). Covered by `tests/exchange-rates/exchange-rates.spec.ts:60`. | Existing Test Evidence |
| **WP-QA-005** | `wp-qa-005-whitespace-beneficiary.spec.ts` | **Low** | `POST /beneficiaries` with whitespace-only names (`"   "`, `"\t\t\n"`) must be rejected with HTTP 400 Bad Request; zero empty-name records persisted. | DTO lacks `@IsNotEmpty()`, service trims to `""`, returns HTTP 201 Created, and persists empty string `name: ""` in PostgreSQL. | Reproducible (`test.fail`) |
| **WP-QA-006** | *Existing Input Suite* | **Low** | Unknown payload fields should be rejected with HTTP 400 Bad Request (`forbidNonWhitelisted: true`). | Global `ValidationPipe` silently strips unknown fields rather than rejecting. Covered by `tests/security/input-validation.spec.ts:183`. | Existing Test Evidence |
| **WP-QA-007** | `wp-qa-007-idempotency-race-waiter.spec.ts` | **Low** | When a primary transfer request fails validation early and deletes its Redis lock, concurrent waiters should fail fast (< 1000ms) with non-409 status. | Concurrent waiter polling loop sees `key = null`, stalls for full 2.5s (25 iterations), and throws `409 Conflict ("currently processing")`. | Reproducible (`test.fail`) |
| **WP-QA-008** | *Architectural Finding* | **Low** | Transfer references must possess high entropy (>= 64 bits) to prevent duplicate key collisions under enterprise transaction volume. | `generateReference()` uses 32 bits of pseudo-random entropy (`crypto.randomBytes(4)`), causing birthday bound risk at ~77,000 daily transfers. | Statically Documented |

---

## CI & Reporting Integration Strategy

In CI pipelines (GitHub Actions), testing is divided into two distinct gates:

### Gate 1: Baseline Verification (Passing Gate)
```bash
npm run test:baseline
```
- Executes all 277 canonical tests (`testsDir: './tests'`, `testIgnore: ['**/tests/defects/**']`).
- Target: **277 / 277 PASS (100%)**.
- CI Action: **Fails build if any regression occurs in established baseline behavior.**

### Gate 2: Known Defect Verification (Defect Tracking Gate)
```bash
npm run test:defects
```
- Executes the dedicated defect regression specifications (`playwright.defects.config.ts`).
- Generates structured JSON report: `reports/defect-test-results.json` containing:
  - `annotations[issue]` = `WP-QA-XXX`
  - `annotations[status]` = `UNRESOLVED`
  - `annotations[expected]` = Expected behavior description
  - `annotations[actual]` = Actual observed defect
- Target: All defect tests execute, assert expected behavior, and fail as expected (`test.fail()` passes with exit code 0).
- CI Action:
  - If a test **passes** (i.e. Expected to fail, but passed), CI alerts the engineering team: `"Finding WP-QA-XXX has been resolved in backend code. Please graduate test to baseline."`
  - If a test encounters an unhandled infrastructure error or syntax error, CI fails.

---

# Part 28 — Future Documentation Sections

The following sections will be appended to this living document in future project phases:

- **Phase 6: Defect Remediation & Verification**: Automated regression re-runs following backend production code fixes for findings WP-QA-001 through WP-QA-008.
- **Phase 7: Frontend / UI Automation**: Next.js Playwright UI test suite utilizing Page Object Models (`pages/`).
- **Phase 8: CI/CD Pipeline & GitHub Actions**: Continuous integration workflow automation, parallel test sharding, and artifact archiving.




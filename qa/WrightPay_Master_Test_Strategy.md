# WrightPay — Master Test Strategy

---

## 1. Document Control

| Field             | Value                                |
|-------------------|--------------------------------------|
| **Document**      | WrightPay Master Test Strategy       |
| **Project**       | WrightPay                            |
| **Document Type** | QA / Test Strategy                   |
| **Version**       | 1.0                                  |
| **Status**        | Draft                                |
| **QA Owner**      | Ankit Pandey                         |
| **Application**   | WrightPay                            |
| **Last Updated**  | 30 August 2026                       |

### Revision History

| Version | Date            | Author        | Description                        |
|---------|-----------------|---------------|------------------------------------|
| 1.0     | 30 August 2026  | Ankit Pandey  | Initial QA strategy baseline       |

---

## 2. Project Overview

### 2.1 Application Summary

**WrightPay** is a full-stack digital payment and financial application that enables authenticated users to perform the following core financial and account-management operations:

| Capability               | Description                                                                 |
|--------------------------|-----------------------------------------------------------------------------|
| **Wallet Management**    | Create, view, and manage multi-currency wallets                             |
| **Currency Equivalents** | View wallet balances expressed in other supported currencies                |
| **Exchange-Rate Quotes** | Obtain live exchange-rate quotes for currency conversion                    |
| **Beneficiary Management** | Add, edit, and remove transfer beneficiaries                             |
| **Card Management**      | Add, view, and manage payment cards                                         |
| **Transaction History**  | View detailed records of all completed, pending, and failed transactions    |
| **Money Transfers**      | Initiate cross-border and peer-to-peer money transfers                      |
| **Profile Management**   | View and update user profile, security settings, and preferences            |

### 2.2 High-Level Architecture

The WrightPay system is composed of the following layers:

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT (BROWSER)                            │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     FRONTEND — Next.js / React                       │
│                     Hosted on Vercel                                  │
│  ┌──────────┐ ┌────────────┐ ┌───────────┐ ┌───────────────────┐     │
│  │  Auth UI │ │ Dashboard  │ │ Wallets   │ │ Send Money / Txns │     │
│  └──────────┘ └────────────┘ └───────────┘ └───────────────────┘     │
│  ┌──────────────┐ ┌────────┐ ┌───────────┐ ┌──────────────────┐     │
│  │ Beneficiaries│ │ Cards  │ │ Profile   │ │ Exchange Rates   │     │
│  └──────────────┘ └────────┘ └───────────┘ └──────────────────┘     │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  REST API calls
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND — NestJS REST API                        │
│                     Hosted on Render                                  │
│  ┌────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐    │
│  │  Auth  │ │  Wallets     │ │  Transfers   │ │ Beneficiaries  │    │
│  └────────┘ └──────────────┘ └──────┬───────┘ └────────────────┘    │
│  ┌────────────┐ ┌──────────┐ ┌──────┼──────┐ ┌────────────────┐    │
│  │   Cards    │ │  Users   │ │ Exch.│Rates │ │ Transactions   │    │
│  └────────────┘ └──────────┘ └──────┼──────┘ └────────────────┘    │
│                                     │                                │
│              ┌──────────────────────┼────────────────────┐           │
│              │   BullMQ Transfer    │    Worker / Processor  │       │
│              │   (Async job queue)  ▼                        │       │
│              └───────────────────────────────────────────────┘       │
└──────────┬───────────────────────┬───────────────────────────────────┘
           │                       │
           ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│    PostgreSQL        │  │      Redis           │
│  (Primary datastore) │  │  (Cache, idempotency │
│  Wallets, users,     │  │   keys, BullMQ job   │
│  transactions,       │  │   broker)            │
│  beneficiaries,      │  │                      │
│  cards, transfers    │  │                      │
└─────────────────────┘  └─────────────────────┘
```

### 2.3 Technology Stack

| Layer                 | Technology                  | Purpose                                       |
|-----------------------|-----------------------------|-----------------------------------------------|
| **Frontend**          | Next.js / React (TypeScript)| Server-rendered and client-side UI             |
| **Backend**           | NestJS (TypeScript)         | REST API, business logic, auth                 |
| **Database**          | PostgreSQL (Supabase)       | Primary relational datastore                   |
| **Cache / Broker**    | Redis                       | Caching, idempotency keys, BullMQ job broker   |
| **Async Processing**  | BullMQ                      | Transfer job queue and worker processing       |
| **Frontend Hosting**  | Vercel                      | Frontend deployment and CDN                    |
| **Backend Hosting**   | Render                      | Backend deployment and managed services        |

### 2.4 Production Topology

```
Browser  ──▶  Vercel (Frontend)  ──▶  Render (NestJS API)  ──▶  PostgreSQL
                                                            ──▶  Redis / BullMQ
```

### 2.5 QA Coverage Commitment

QA will test **both individual components and their interactions** across the full stack. This includes:

- Isolated unit-level verification of frontend components and backend services
- Integration testing across module boundaries (e.g., Transfers → Wallets → PostgreSQL)
- End-to-end validation of complete user workflows through the production topology
- Infrastructure-level validation of async processing (BullMQ), caching (Redis), and data persistence (PostgreSQL)

---

## 3. Testing Objectives

The WrightPay QA program is guided by the following eight core testing objectives. Each objective maps to one or more testing activities that will be defined in subsequent strategy sections.

### 3.1 Functional Correctness

Verify that every user-facing feature and backend operation behaves according to specified requirements and expected behavior. All API endpoints, UI workflows, validation rules, error handling paths, and edge cases must produce correct, consistent results.

### 3.2 Financial Integrity

As a financial application, WrightPay must demonstrate **zero tolerance for financial data errors**. QA will explicitly verify:

| Financial Integrity Requirement              | Description                                                                                       |
|----------------------------------------------|---------------------------------------------------------------------------------------------------|
| **Accurate wallet balances**                 | Wallet balances must reflect the exact net effect of all completed credits and debits              |
| **Correct transfer amounts**                 | Source debit, destination credit, and any applied exchange rates must be arithmetically correct     |
| **Prevention of duplicate financial ops**    | Idempotency controls must prevent duplicate transfers, double debits, or double credits            |
| **Correct transaction records**              | Every financial operation must produce an accurate, immutable transaction record                    |
| **Concurrency safety**                       | Concurrent transfers against the same wallet must not cause race conditions, lost updates, or phantom balances |
| **Financial state ↔ database consistency**   | In-memory financial state, API responses, and database records must always be consistent           |

### 3.3 Data Integrity

Verify that all data persisted to PostgreSQL maintains referential integrity, respects schema constraints (NOT NULL, UNIQUE, CHECK, FOREIGN KEY), and survives failure scenarios without corruption. Validate that Redis state (idempotency keys, locks) behaves correctly under normal and failure conditions.

### 3.4 Security

Validate that the application enforces robust security controls across all layers. QA will explicitly test for the following security concerns:

| Security Area                     | Testing Focus                                                                                   |
|-----------------------------------|-------------------------------------------------------------------------------------------------|
| **Authentication**                | Login, signup, OTP verification, session management, logout, token refresh                      |
| **Authorization**                 | Role-based and ownership-based access control on all endpoints and UI routes                     |
| **User isolation**                | Verify that no user can access, modify, or view another user's data                             |
| **IDOR / BOLA**                   | Test all parameterized endpoints for Insecure Direct Object Reference and Broken Object-Level Authorization |
| **Token security**                | JWT issuance, validation, expiry, revocation, storage, and transmission                         |
| **Injection**                     | SQL injection, NoSQL injection, command injection, template injection                           |
| **XSS**                           | Reflected, stored, and DOM-based cross-site scripting                                           |
| **CORS**                          | Cross-Origin Resource Sharing policy validation                                                  |
| **Rate limiting**                 | Brute-force protection on authentication, transfer, and sensitive endpoints                     |
| **Sensitive-data exposure**       | Verify that passwords, tokens, PII, and financial data are never leaked in responses, logs, or error messages |

### 3.5 Reliability and Failure Handling

Verify that the system degrades gracefully under failure conditions, including:
- Database connection loss or timeout
- Redis unavailability
- BullMQ worker crashes or job failures
- Network interruptions between frontend and backend
- Invalid or malformed input at every boundary
- Concurrent access to shared resources

### 3.6 Performance

Validate that the application meets acceptable performance thresholds for:
- API response times under normal and peak load
- Concurrent user throughput
- Transfer processing latency (end-to-end, including BullMQ)
- Database query performance
- Frontend page load and time-to-interactive

### 3.7 Test Automation and Maintainability

Build a sustainable, maintainable test automation suite that:
- Covers critical paths with automated regression tests
- Integrates into the CI/CD pipeline
- Provides fast, reliable feedback on every code change
- Is structured for long-term maintainability with clear patterns and conventions
- Supports parallel execution and environment isolation

### 3.8 Production / Release Confidence

Establish quality gates and release criteria that provide high confidence in production readiness, including:
- Defined entry and exit criteria for each testing phase
- Smoke tests executable against production
- Clear pass/fail criteria for release sign-off
- Traceability from requirements to test coverage

---

## 4. Testing Scope

### 4.1 In Scope

#### 4.1.1 Frontend Testing

| Area                       | Coverage Details                                                                              |
|----------------------------|-----------------------------------------------------------------------------------------------|
| **Authentication**         | Login, signup, OTP verification, email verification, logout, session persistence              |
| **Dashboard**              | Wallet summary display, recent transactions, quick actions, data loading                      |
| **Wallets**                | Wallet list, balance display, currency equivalents, wallet details                            |
| **Exchange Rates**         | Rate display, quote generation, currency selection, rate refresh                              |
| **Beneficiaries**          | Add, edit, delete beneficiaries; validation; list display; search/filter                      |
| **Cards**                  | Add, view, manage cards; card validation; card display                                        |
| **Transactions**           | Transaction list, filtering, sorting, pagination, transaction detail view                     |
| **Transfers / Send Money** | Transfer initiation, beneficiary selection, amount entry, confirmation, status tracking       |
| **Profile**                | View and update profile fields, security settings, preferences                                |
| **Navigation**             | Route transitions, sidebar/nav behavior, deep linking, back/forward, protected routes         |
| **Validation**             | Client-side form validation, error messaging, field constraints, required fields              |
| **Loading / Error States** | Skeleton loaders, spinners, error boundaries, retry mechanisms, empty states                  |
| **Responsive Behavior**    | Layout across desktop, tablet, and mobile breakpoints                                         |
| **Accessibility**          | Keyboard navigation, screen reader compatibility, ARIA attributes, color contrast             |

#### 4.1.2 Backend / API Testing

| Area                        | Coverage Details                                                                             |
|-----------------------------|----------------------------------------------------------------------------------------------|
| **REST Endpoints**          | All CRUD and action endpoints across auth, wallets, transfers, beneficiaries, cards, users, transactions, exchange-rates |
| **Authentication**          | Login, signup, OTP, token issuance, token refresh, session management                        |
| **Authorization**           | Endpoint-level access control, ownership validation, role enforcement                        |
| **Input Validation**        | DTO validation, boundary values, type coercion, malformed payloads, missing fields           |
| **Response Contracts**      | Status codes, response body structure, error response format, pagination                     |
| **Error Handling**          | Graceful error responses, appropriate status codes, no stack trace leakage                    |
| **Business Logic**          | Transfer orchestration, balance calculations, exchange-rate application, idempotency          |
| **Transfer Processing**     | Full transfer lifecycle: initiation → queue → processing → completion/failure → record       |

#### 4.1.3 Database Testing (PostgreSQL)

| Area                        | Coverage Details                                                                             |
|-----------------------------|----------------------------------------------------------------------------------------------|
| **Persistence**             | Correct storage and retrieval of all entity types                                            |
| **Relationships**           | Foreign key integrity, cascading behavior, join correctness                                  |
| **Constraints**             | NOT NULL, UNIQUE, CHECK, DEFAULT constraints enforced correctly                              |
| **Transactions**            | ACID compliance, rollback on failure, isolation levels                                       |
| **Concurrency**             | Concurrent writes, row-level locking, deadlock prevention                                    |
| **Financial Data Integrity**| Balance accuracy after transfers, no phantom/lost updates, audit trail completeness           |

#### 4.1.4 Redis Testing

| Area                        | Coverage Details                                                                             |
|-----------------------------|----------------------------------------------------------------------------------------------|
| **Idempotency**             | Idempotency key storage, deduplication behavior, key format and uniqueness                   |
| **TTL**                     | Key expiry behavior, TTL correctness for idempotency and cache keys                          |
| **Locks**                   | Distributed lock acquisition, release, contention, and timeout behavior                      |
| **Failure / Recovery**      | Behavior when Redis is unavailable, reconnection, data loss implications                     |

#### 4.1.5 BullMQ Testing

| Area                        | Coverage Details                                                                             |
|-----------------------------|----------------------------------------------------------------------------------------------|
| **Job Creation**            | Correct job data, queue assignment, job options (delay, priority, attempts)                   |
| **Processing**              | Worker pickup, correct execution, side-effect verification (wallet updates, records)          |
| **State Transitions**       | Job states: waiting → active → completed/failed, state accuracy                              |
| **Retries**                 | Retry count, backoff strategy, retry behavior on transient failures                          |
| **Failures**                | Permanent failure handling, dead-letter behavior, failure callbacks                          |
| **Duplicate / Concurrent**  | Duplicate job prevention, concurrent job processing for same wallet, ordering guarantees      |

#### 4.1.6 Security Testing

| Area                          | Coverage Details                                                                           |
|-------------------------------|--------------------------------------------------------------------------------------------|
| **Authentication**            | Credential validation, OTP bypass attempts, brute force, account lockout                   |
| **Authorization**             | Privilege escalation, role bypass, endpoint access without valid session                    |
| **IDOR / BOLA**               | Accessing resources by manipulating IDs in URLs, request bodies, and query params          |
| **JWT**                       | Token forgery, expired tokens, tampered payloads, algorithm confusion                      |
| **OTP**                       | OTP brute force, OTP reuse, OTP bypass, timing attacks                                     |
| **Injection**                 | SQL injection on all user-controlled inputs, parameterized query verification              |
| **XSS**                       | Script injection in all text fields, URL parameters, and rendered content                  |
| **CORS**                      | Allowed origins, preflight handling, credentialed request policy                           |
| **Rate Limiting**             | Throttle enforcement on login, transfer, OTP, and high-risk endpoints                     |
| **Sensitive Data Exposure**   | API response sanitization, log redaction, error message content, HTTPS enforcement         |

#### 4.1.7 Performance Testing

| Area                        | Coverage Details                                                                             |
|-----------------------------|----------------------------------------------------------------------------------------------|
| **Response Time**           | P50, P95, P99 latency for critical API endpoints under baseline load                         |
| **Throughput**              | Maximum requests per second for key endpoints before degradation                             |
| **Concurrency**            | Behavior under concurrent user sessions, concurrent transfers, shared resource contention     |
| **Sustained Load**         | System stability and resource consumption under sustained load over time                     |
| **Transfer Processing**    | End-to-end transfer latency including BullMQ queue time and processing time                  |

#### 4.1.8 Automation

| Area                        | Coverage Details                                                                             |
|-----------------------------|----------------------------------------------------------------------------------------------|
| **API Automation**          | Automated test suites for all REST endpoints covering positive, negative, and edge cases     |
| **UI / E2E Automation**    | Browser-based automation of critical user workflows                                          |
| **Database Validation**    | Automated verification of data state after operations                                        |
| **CI/CD Integration**      | Automated test execution on pull requests, merges, and deployments                           |

#### 4.1.9 Deployment Testing

| Area                        | Coverage Details                                                                             |
|-----------------------------|----------------------------------------------------------------------------------------------|
| **Vercel Frontend**         | Build verification, routing, environment variable injection, CDN behavior                    |
| **Render Backend**          | Deployment health, startup checks, environment configuration                                 |
| **Environment Config**      | Correct configuration across development, staging, and production                            |
| **Production Connectivity** | Frontend → Backend connectivity, Backend → PostgreSQL/Redis connectivity, end-to-end smoke   |

---

### 4.2 Out of Scope

The following areas are **explicitly out of scope** for WrightPay QA. These have **not been tested** and no claims are made regarding their correctness or compliance.

| Out-of-Scope Area                              | Rationale                                                                                 |
|------------------------------------------------|-------------------------------------------------------------------------------------------|
| **Real-world banking network settlement**      | WrightPay simulates transfers internally; it does not connect to real banking networks     |
| **Real external bank integrations**            | No actual bank APIs (e.g., Plaid, Stripe Connect, SWIFT) are integrated                   |
| **Real payment processor settlement**          | Unless/until such integration is introduced, no real payment processing occurs             |
| **Formal regulatory certification**            | PCI-DSS, SOC 2, ISO 27001, RBI certification, and similar audits are not in scope         |
| **Destructive testing against production data**| No testing will intentionally corrupt, delete, or stress-test real production user data     |
| **External systems not implemented by WrightPay** | Third-party services, external APIs, or infrastructure not part of WrightPay are excluded |

> **Note:** If any of these areas are introduced in the future (e.g., real payment processor integration), the testing scope will be revised accordingly with a new version of this document.

---

## 5. System Under Test

### 5.1 SUT Component Map

| Component              | Technology           | Deployment    | Description                                                  |
|------------------------|----------------------|---------------|--------------------------------------------------------------|
| **Frontend**           | Next.js / React (TS) | Vercel        | Server-rendered and client-side UI application                |
| **Backend API**        | NestJS (TS)          | Render        | RESTful API: authentication, business logic, data access      |
| **Database**           | PostgreSQL (Supabase)| Supabase      | Primary relational datastore for all persistent data          |
| **Cache / Broker**     | Redis                | Managed       | Caching, idempotency key storage, BullMQ job broker           |
| **Async Worker**       | BullMQ (Node.js)     | Render        | Background transfer processing worker                        |

### 5.2 Testing Levels

Testing will occur at the following levels, from most isolated to most integrated:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TESTING LEVEL PYRAMID                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ▲  Production Smoke                                          │
│   ▲▲▲  End-to-End / System                                     │
│  ▲▲▲▲▲  Infrastructure / Async Processing                      │
│ ▲▲▲▲▲▲▲  Database                                              │
│▲▲▲▲▲▲▲▲▲  API / Integration                                    │
│▲▲▲▲▲▲▲▲▲▲▲ Component / Unit                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Level                               | Scope                                                                                         |
|--------------------------------------|-----------------------------------------------------------------------------------------------|
| **Component / Unit**                 | Individual functions, services, components in isolation with mocked dependencies               |
| **Integration**                      | Module interactions (e.g., TransfersService → WalletsService → Database)                      |
| **API**                              | HTTP-level testing of REST endpoints with real or test database                                |
| **Database**                         | Direct database verification of schema, constraints, data state, and query behavior           |
| **Infrastructure / Async Processing**| Redis behavior, BullMQ job lifecycle, worker processing, failure recovery                     |
| **End-to-End / System**             | Full-stack browser-to-database workflows through the complete deployed topology                |
| **Production Smoke**                 | Lightweight post-deployment verification against the live production environment              |

### 5.3 Key End-to-End Path

The critical end-to-end path through the WrightPay system is:

```
┌─────────┐     HTTPS      ┌─────────────────┐    REST API    ┌─────────────────┐
│ Browser │ ──────────────▶ │ Vercel Frontend  │ ────────────▶ │ Render NestJS   │
│         │                 │ (Next.js/React)  │               │ API             │
└─────────┘                 └─────────────────┘               └────────┬────────┘
                                                                       │
                                                          ┌────────────┼────────────┐
                                                          │            │            │
                                                          ▼            ▼            ▼
                                                   ┌──────────┐ ┌──────────┐ ┌──────────┐
                                                   │PostgreSQL│ │  Redis   │ │ BullMQ   │
                                                   │          │ │          │ │ Worker   │
                                                   └──────────┘ └──────────┘ └──────────┘
```

**Transfer Workflow (Critical Financial Path):**

```
1. User initiates transfer           →  Browser → Vercel Frontend
2. Frontend calls transfer API       →  Frontend → Render NestJS API
3. API validates and creates job     →  NestJS → Redis (idempotency) → PostgreSQL (record) → BullMQ (job)
4. Worker picks up and processes     →  BullMQ Worker → PostgreSQL (debit source, credit dest, update status)
5. Status reflected in UI            →  Browser ← Vercel Frontend ← Render NestJS API ← PostgreSQL
```

This path exercises every component in the SUT and is the highest-priority end-to-end test scenario.

### 5.4 Backend Module Map

The NestJS backend consists of the following domain modules, each a target for API and integration testing:

| Module             | Responsibilities                                                         |
|--------------------|--------------------------------------------------------------------------|
| **Auth**           | Login, signup, OTP verification, JWT issuance, session management        |
| **Users**          | User profile CRUD, account settings                                      |
| **Wallets**        | Wallet CRUD, balance management, multi-currency support                  |
| **Transfers**      | Transfer initiation, orchestration, BullMQ job creation                  |
| **Transactions**   | Transaction record creation, history retrieval, filtering                |
| **Beneficiaries**  | Beneficiary CRUD, validation                                             |
| **Cards**          | Card CRUD, validation                                                    |
| **Exchange Rates** | Rate retrieval, quote generation                                         |

### 5.5 Frontend Route Map

The Next.js frontend exposes the following route structure:

| Route                         | Page / Feature                      |
|-------------------------------|-------------------------------------|
| `/`                           | Landing / Home page                 |
| `/login`                      | User login                          |
| `/signup`                     | User registration                   |
| `/verify-email`               | Email verification                  |
| `/onboarding`                 | New user onboarding                 |
| `/dashboard`                  | Main dashboard                      |
| `/dashboard/wallets`          | Wallet management                   |
| `/dashboard/beneficiaries`    | Beneficiary management              |
| `/dashboard/cards`            | Card management                     |
| `/dashboard/transactions`     | Transaction history                 |
| `/dashboard/send-money`       | Money transfer / Send money         |
| `/dashboard/profile`          | User profile                        |
| `/operations`                 | Operations view                     |
| `/admin`                      | Admin panel                         |
| `/compliance`                 | Compliance view                     |

---

## 6. Testing Levels

### Conceptual Distinction: Testing Levels vs. Testing Types

Two foundational concepts govern how testing is organized in this strategy:

| Concept            | Question It Answers                                      |
|--------------------|----------------------------------------------------------|
| **Testing Level**  | *Where* in the system are we testing?                    |
| **Testing Type**   | *What* characteristic or behavior are we evaluating?     |

A **testing level** defines the architectural scope of a test — which layers and components are exercised. A **testing type** defines the quality attribute being evaluated — for example, functional correctness, security, performance, or data integrity.

These concepts are **different** but **can overlap**. For example:

- A *security* test (type) can be executed at the *API* level (level) or the *E2E* level (level).
- A *functional* test (type) can be executed at the *unit* level (level), the *integration* level (level), or the *E2E* level (level).
- A *performance* test (type) can target the *API* level (level), the *database* level (level), or the *system* level (level).

This section documents the **testing levels** used in the WrightPay QA program. Testing types are documented separately in a subsequent section.

---

### 6.1 Unit Testing

**Purpose:** Test isolated functions, methods, services, validators, and business logic in complete isolation from external dependencies. Dependencies are mocked or stubbed.

**WrightPay Examples:**

| Area                        | Examples                                                                      |
|-----------------------------|-------------------------------------------------------------------------------|
| **Transfer business rules** | Validate transfer eligibility checks, same-wallet rejection, insufficient-balance logic |
| **Fee calculations**        | Verify fee computation for different transfer amounts, currencies, and tiers  |
| **OTP generation**          | Verify OTP format, length, expiry, and uniqueness                             |
| **Input validation**        | DTO validation rules, boundary values, type constraints, required fields      |
| **State transition logic**  | Transfer status transitions (PENDING → PROCESSING → COMPLETED / FAILED)      |

> **Note:** Existing backend Jest unit tests (e.g., `transfers.service.spec.ts`, `wallets.service.spec.ts`, `cards.service.spec.ts`) will be **reviewed and extended where appropriate** rather than blindly duplicated. QA will identify gaps in existing unit test coverage and supplement with additional tests targeting untested branches, edge cases, and financial business rules.

---

### 6.2 Integration Testing

**Purpose:** Verify that multiple application components work correctly together when connected through real or realistic dependencies, crossing module and infrastructure boundaries.

**WrightPay Examples:**

| Integration Boundary                       | What Is Verified                                                                              |
|--------------------------------------------|-----------------------------------------------------------------------------------------------|
| **NestJS Services → PostgreSQL**           | Service methods correctly persist, query, and update database records                         |
| **NestJS Services → Redis**                | Idempotency key storage/lookup, distributed lock acquisition/release, cache behavior          |
| **NestJS Services → BullMQ**               | Transfer service correctly enqueues jobs; worker correctly processes jobs                     |
| **TransfersService → WalletsService**      | Transfer orchestration correctly debits source wallet, credits destination wallet              |
| **Transfer processing → Transaction records** | Completed transfers produce accurate, immutable transaction records                        |
| **Transaction boundaries**                 | Multi-step operations roll back atomically on failure (e.g., debit without credit)            |
| **Locking / Idempotency**                  | Concurrent transfers against the same wallet are serialized; duplicate requests are rejected  |

---

### 6.3 API Testing

**Purpose:** Validate WrightPay REST API behavior by sending HTTP requests to backend endpoints and verifying responses, side effects, and contracts.

**Coverage Areas:**

| Area                      | What Is Verified                                                                                 |
|---------------------------|--------------------------------------------------------------------------------------------------|
| **Request validation**    | Required fields, type constraints, boundary values, malformed payloads, extra fields             |
| **Response validation**   | Response body structure, field types, field values, pagination, envelope format                   |
| **Status codes**          | Correct HTTP status codes for success, client error, server error, auth failure                   |
| **Headers**               | Content-Type, Authorization, CORS headers, cache-control, rate-limit headers                     |
| **Authentication**        | Endpoints reject unauthenticated requests; valid tokens grant access                             |
| **Authorization**         | Endpoints enforce ownership; users cannot access other users' resources (IDOR/BOLA)              |
| **Error handling**        | Graceful error responses, no stack trace leakage, consistent error envelope format                |
| **API contracts**         | Response schemas remain stable across changes; backward compatibility                            |
| **Business behavior**     | API-level verification of business rules (e.g., transfer limits, balance checks, rate quotes)    |
| **Database side effects** | API calls produce correct database state (e.g., POST /transfers creates transfer + job records)  |

---

### 6.4 Database Testing

**Purpose:** Validate persistence, consistency, and financial data integrity directly at the PostgreSQL database level.

**Coverage Areas:**

| Area                       | What Is Verified                                                                                |
|----------------------------|-------------------------------------------------------------------------------------------------|
| **CRUD persistence**       | All entity types (users, wallets, transfers, transactions, beneficiaries, cards) persist correctly |
| **Relationships**          | Foreign key integrity, cascading deletes/updates, join correctness                              |
| **Constraints**            | NOT NULL, UNIQUE, CHECK, DEFAULT constraints enforced; invalid data rejected                    |
| **Transactions (ACID)**    | Multi-statement operations commit atomically or roll back entirely                              |
| **Rollback behavior**      | Failed operations leave no partial state; database returns to pre-operation state               |
| **Row-level locking**      | Concurrent writes to the same row are serialized; no lost updates                               |
| **Concurrent updates**     | Concurrent transfers against the same wallet produce correct final balances                     |
| **Wallet balances**        | Post-transfer balances equal pre-transfer balances ± transfer amount (after all operations)     |
| **Transaction records**    | Every completed transfer produces an accurate, immutable transaction record                     |
| **Data consistency**       | API-reported state, in-memory state, and database state are always consistent                   |

---

### 6.5 Infrastructure / Asynchronous Processing Testing

**Purpose:** Validate Redis and BullMQ behavior, including caching, idempotency, distributed locking, job lifecycle, and failure recovery.

**Coverage Areas:**

#### Redis

| Area                          | What Is Verified                                                                         |
|-------------------------------|------------------------------------------------------------------------------------------|
| **Connectivity**              | Application connects to Redis; reconnects after transient failures                       |
| **Idempotency keys**         | Duplicate transfer requests with the same idempotency key are rejected                   |
| **TTL behavior**              | Keys expire at the configured TTL; expired keys allow re-submission                      |
| **Distributed / concurrency locking** | Locks serialize concurrent access to shared resources; locks release on completion or timeout |

#### BullMQ

| Area                          | What Is Verified                                                                         |
|-------------------------------|------------------------------------------------------------------------------------------|
| **Job creation**              | Transfer initiation creates a job with correct data, queue, and options                  |
| **Job processing**            | Worker picks up jobs and executes the transfer (debit, credit, record)                   |
| **State transitions**         | Jobs transition correctly: waiting → active → completed/failed                           |
| **Retries**                   | Transient failures trigger retries with configured backoff; retry count is respected      |
| **Duplicate jobs**            | Duplicate jobs for the same transfer are prevented or handled idempotently               |
| **Worker failure / recovery** | Worker crash during processing does not leave inconsistent financial state; jobs are retried or failed gracefully |

---

### 6.6 End-to-End / System Testing

**Purpose:** Validate complete real-user workflows across the full deployed application stack, from browser interaction through to database state verification.

**Full Stack Path:**

```
Browser  →  Vercel (Frontend)  →  Render (NestJS API)  →  PostgreSQL / Redis / BullMQ
```

**WrightPay E2E Workflow Examples:**

| Workflow                                        | Steps Covered                                                                                     |
|-------------------------------------------------|---------------------------------------------------------------------------------------------------|
| **Signup → Verification → Login → Dashboard**   | User registration, email/OTP verification, first login, dashboard render with initial state        |
| **Login → Wallet**                              | Authentication, navigation to wallets, wallet list display, balance and currency verification      |
| **Login → Beneficiary → Transfer**              | Authentication, beneficiary creation, transfer initiation, confirmation, status tracking           |
| **Transfer lifecycle**                          | Transfer PENDING → BullMQ worker processing → COMPLETED → wallet balance update → transaction record verification |

E2E tests will verify both the **UI behavior** (correct rendering, navigation, feedback) and the **backend/data state** (correct database records, accurate balances, proper status transitions).

---

### 6.7 Production Smoke / Deployment Verification

**Purpose:** Verify that the deployed production system is operational and healthy immediately after each deployment. Smoke tests are lightweight, non-destructive, and designed to catch deployment-breaking issues quickly.

**Coverage Areas:**

| Area                                    | What Is Verified                                                                         |
|-----------------------------------------|------------------------------------------------------------------------------------------|
| **Frontend availability**               | Vercel-hosted frontend loads, renders, and is accessible                                 |
| **Backend availability**                | Render-hosted NestJS API responds to health checks                                       |
| **Authentication**                      | Login flow completes successfully with valid credentials                                 |
| **Critical API availability**           | Key endpoints (wallets, transfers, beneficiaries, transactions) respond correctly         |
| **Database connectivity**               | Application-level operations that require database access succeed                        |
| **Redis / BullMQ critical path**        | Operations that depend on Redis (e.g., idempotency checks) and BullMQ (e.g., transfer queuing) function correctly |
| **Critical financial workflow smoke**   | A lightweight transfer workflow completes end-to-end without errors                      |

> **⚠️ Important:** Destructive testing will **not** be performed against production data. Production smoke tests use dedicated test accounts and are designed to verify operational health without modifying, corrupting, or stress-testing real user data.

---

### 6.8 Testing-Level Summary

| Testing Level            | Primary Objective              | WrightPay Examples                                  | Planned Automation        |
|--------------------------|--------------------------------|-----------------------------------------------------|---------------------------|
| **Unit**                 | Isolated logic correctness     | Services, validators, business rules                | Jest                      |
| **Integration**          | Component interaction          | DB / Redis / BullMQ / service interactions           | Jest / Supertest / etc.   |
| **API**                  | HTTP contract and behavior     | REST endpoints                                      | API automation            |
| **Database**             | Persistence / data integrity   | PostgreSQL / financial records                      | SQL / DB automation       |
| **Async / Infrastructure** | Queue / cache correctness    | Redis / BullMQ / transfers                          | Automated integration tests |
| **E2E / System**         | Complete user journeys         | Browser → backend → data                            | Playwright                |
| **Production Smoke**     | Deployment health              | Critical production journeys                        | Playwright / API          |

---

### 6.9 WrightPay Testing-Level Strategy

The WrightPay QA program employs a **multi-level testing strategy** rather than relying exclusively on UI/E2E testing. Each testing level serves a distinct purpose and provides unique value:

| Testing Level              | Strategic Value                                                                                  |
|----------------------------|--------------------------------------------------------------------------------------------------|
| **Unit tests**             | Provide the **fastest feedback loop**; catch logic errors in seconds during development          |
| **Integration tests**      | Validate **component interactions** and data flow across service, database, and infrastructure boundaries |
| **API tests**              | Provide **broad service coverage** of HTTP contracts, business rules, and authorization without browser overhead |
| **Database tests**         | Validate **data state and consistency** directly, catching constraint violations and integrity issues that may be invisible at the API level |
| **Infrastructure tests**   | Validate **async processing correctness** — ensuring Redis, BullMQ, and worker behavior is reliable under normal and failure conditions |
| **E2E / System tests**     | Validate **critical user journeys** end-to-end through the real deployed stack, catching integration issues that lower levels cannot |
| **Production smoke tests** | Validate **deployment health** and catch environment-specific issues in production               |

#### Multi-Level Coverage for High-Risk Functionality

High-risk financial functionality — particularly **money transfers** — receives coverage across **multiple testing levels** to maximize defect detection and minimize financial risk:

```
Transfer Coverage Across Levels:

  Unit        →  Business rules, fee calc, validation, state transitions
  Integration →  Service → DB → Redis → BullMQ interactions, transaction boundaries
  API         →  HTTP contract, auth, error handling, idempotency, side effects
  Database    →  Balance accuracy, constraint enforcement, concurrent updates
  Infra       →  Job lifecycle, retries, duplicate prevention, worker recovery
  E2E         →  Complete user journey: initiate → process → verify balance + record
  Smoke       →  Production transfer health check
```

This layered approach ensures that a defect in transfer logic is likely to be caught at the **earliest and cheapest** testing level, while still maintaining **end-to-end confidence** through higher-level tests.

---

## 7. Testing Types

### Conceptual Distinction: Testing Levels vs. Testing Types (Recap)

As established in Section 6:

| Concept            | Question It Answers                                                  |
|--------------------|----------------------------------------------------------------------|
| **Testing Level**  | *Where* in the system are we testing?                                |
| **Testing Type**   | *What* characteristic, behavior, risk, or quality attribute are we evaluating? |

A **testing level** defines the architectural scope (unit, integration, API, database, infrastructure, E2E, production smoke). A **testing type** defines the quality dimension being evaluated (functional correctness, security, performance, financial integrity, etc.).

**Key principle:** A single test can belong to **multiple testing types** and can be executed at **different testing levels**. For example, a test that verifies a transfer is rejected when the wallet has insufficient balance is simultaneously:

- A **functional** test (verifying business behavior)
- A **negative** test (verifying rejection of invalid state)
- A **financial integrity** test (verifying balance protection)
- An **authorization** test (verifying ownership enforcement)

This section documents all testing types applied in the WrightPay QA program.

---

### 7.1 Functional Testing

**Purpose:** Verify that WrightPay behaves according to its intended functional and business requirements. Every user-facing feature and backend operation must produce correct results under valid conditions.

**WrightPay Functional Testing Areas:**

| Feature Area             | Functional Testing Examples                                                              |
|--------------------------|------------------------------------------------------------------------------------------|
| **Signup / Login**       | User registration, credential validation, OTP verification, session creation             |
| **Wallet Operations**    | Wallet creation, balance display, currency equivalents, wallet listing                   |
| **Exchange-Rate Quotes** | Rate retrieval, quote generation, currency pair selection, rate freshness                |
| **Beneficiary Management** | Add, edit, delete beneficiaries; validation; duplicate prevention                     |
| **Card Lifecycle**       | Card creation, card display, card state management, card validation                      |
| **Transaction History**  | Transaction list rendering, filtering, sorting, pagination, detail view                  |
| **Money Transfers**      | Transfer initiation, amount/beneficiary validation, confirmation, status tracking, completion |
| **Profile Management**   | View profile, update fields, change settings, profile display consistency                |

---

### 7.2 Positive Testing

**Purpose:** Verify that the system produces correct, expected results when provided with **valid inputs and expected successful workflows**.

**WrightPay Positive Testing Examples:**

| Scenario                                   | Expected Result                                                        |
|--------------------------------------------|------------------------------------------------------------------------|
| Login with valid credentials               | User is authenticated, JWT issued, dashboard loads                     |
| Create beneficiary with valid data         | Beneficiary is persisted and appears in beneficiary list               |
| Initiate transfer with valid amount/beneficiary | Transfer is created, queued, processed, balances updated          |
| Fetch wallets for authenticated user       | Correct wallet list with accurate balances returned                    |
| Request exchange-rate quote for valid pair  | Valid quote with current rate returned                                 |
| Add card with valid details                | Card is persisted and appears in card list                             |

---

### 7.3 Negative Testing

**Purpose:** Verify that the system handles **invalid inputs, invalid states, unauthorized actions, and error conditions** gracefully, producing correct error responses without corrupting state.

**WrightPay Negative Testing Examples:**

| Scenario                                     | Expected Behavior                                                      |
|----------------------------------------------|------------------------------------------------------------------------|
| **Invalid credentials**                      | Login rejected with appropriate error; no session created              |
| **Invalid / expired OTP**                    | Verification rejected; account remains unverified                      |
| **Insufficient balance**                     | Transfer rejected; wallet balance unchanged                            |
| **Invalid currency**                         | Request rejected with validation error                                 |
| **Invalid / non-existent beneficiary**       | Transfer rejected; no job queued                                       |
| **Malformed request body**                   | 400 Bad Request with clear error details; no side effects              |
| **Unauthorized resource access**             | 401/403 returned; no data exposed                                      |
| **Accessing another user's wallet/card/txn** | 403 Forbidden or 404 Not Found; zero data leakage                      |

---

### 7.4 Boundary / Edge-Case Testing

**Purpose:** Test values at, just below, and just above important limits and boundaries to catch off-by-one errors, precision issues, and constraint violations.

**WrightPay Boundary Testing Examples:**

| Boundary                              | Test Values                                                                      |
|---------------------------------------|----------------------------------------------------------------------------------|
| **Transfer amount — zero**            | Amount = 0 → rejected                                                            |
| **Transfer amount — minimum valid**   | Amount = minimum allowed → accepted                                              |
| **Transfer amount — maximum valid**   | Amount = maximum allowed → accepted                                              |
| **Transfer amount — above balance**   | Amount = balance + 0.01 → rejected; balance unchanged                            |
| **Decimal precision**                 | Amounts with excessive decimal places → handled correctly (truncated or rejected) |
| **Maximum beneficiary limit**         | At limit → rejected; below limit → accepted                                      |
| **Maximum card limit**                | At limit → rejected; below limit → accepted                                      |
| **Pagination boundaries**            | Page 0, page 1, last page, page beyond last → correct results or empty set       |
| **String length limits**              | Field values at min/max length → accepted; beyond → rejected                     |

---

### 7.5 Validation Testing

**Purpose:** Test DTO, request, and input validation to ensure that invalid data is **rejected consistently** at every entry point, with clear and accurate error messages.

**Coverage Areas:**

| Validation Area        | Examples                                                                               |
|------------------------|----------------------------------------------------------------------------------------|
| **Required fields**    | Omit each required field individually; verify 400 response with field-level error       |
| **Data types**         | Submit string where number expected, number where string expected, null, undefined      |
| **Formats**            | Invalid email format, invalid phone format, invalid date format                         |
| **Ranges**             | Negative amounts, amounts exceeding limits, future/past date constraints               |
| **Enum values**        | Invalid currency codes, invalid transfer statuses, invalid card types                   |
| **Malformed IDs**      | Non-UUID strings, empty strings, SQL injection payloads in ID fields                   |
| **Invalid currencies** | Unsupported currency codes, empty currency fields, null currency                       |

---

### 7.6 Business-Rule Testing

**Purpose:** Verify WrightPay-specific business rules that govern application behavior beyond simple validation.

**WrightPay Business Rules:**

| Business Rule                     | Test Focus                                                                               |
|-----------------------------------|------------------------------------------------------------------------------------------|
| **Sufficient wallet balance**     | Transfer rejected if source wallet balance < transfer amount                             |
| **Beneficiary limits**            | Maximum number of beneficiaries per user enforced                                        |
| **Card state transitions**        | Cards follow valid state transitions only (e.g., cannot activate an already-active card) |
| **Transfer rules**                | Cannot transfer to own wallet; must specify valid beneficiary; amount constraints        |
| **Exchange-rate rules**           | Quotes use current rates; expired quotes are rejected or refreshed                       |
| **Idempotency behavior**          | Duplicate transfer requests with same idempotency key return original result, not duplicate |
| **Ownership rules**               | Users can only operate on resources they own; cross-user operations are rejected         |

---

### 7.7 Regression Testing

**Purpose:** Verify that **existing functionality remains correct after code changes**, refactoring, bug fixes, dependency updates, or new feature additions.

**Regression Coverage Across Testing Levels:**

| Testing Level   | Regression Strategy                                                                        |
|-----------------|--------------------------------------------------------------------------------------------|
| **Unit**        | Existing Jest unit tests run on every change; new tests added for fixed bugs               |
| **API**         | API regression suite validates all endpoint contracts, status codes, and business rules     |
| **Integration** | Integration regression tests verify service-to-database and service-to-infrastructure paths |
| **E2E**         | Critical user journey regression tests run before every release                             |

Regression tests will be automated and integrated into the CI/CD pipeline to provide continuous feedback on code changes.

---

### 7.8 Smoke Testing

**Purpose:** Perform a **shallow, fast verification** that the major system functionality is operational. Smoke tests answer: *"Is the system fundamentally working?"*

**WrightPay Smoke Test Examples:**

| Smoke Check                          | Verification                                                      |
|--------------------------------------|-------------------------------------------------------------------|
| **Application loads**                | Frontend renders without errors                                   |
| **Login works**                      | Valid credentials produce a successful authentication             |
| **Authenticated dashboard loads**    | Dashboard page renders with wallet summary and navigation         |
| **Wallet API responds**             | GET /wallets returns 200 with valid wallet data                    |
| **Exchange-rate API responds**       | GET /exchange-rates returns 200 with valid rate data              |
| **Critical transfer path available** | POST /transfers accepts a valid transfer request                  |

Smoke tests are designed to run in **under 2 minutes** and are executed after every deployment.

---

### 7.9 Sanity Testing

**Purpose:** Perform **focused, targeted verification** of a specific feature or fix after a change, without running the full regression suite. Sanity testing answers: *"Does this specific change work as expected, and has it broken the immediately related functionality?"*

**How sanity testing differs from smoke testing:**

| Aspect          | Smoke Testing                                        | Sanity Testing                                           |
|-----------------|------------------------------------------------------|----------------------------------------------------------|
| **Scope**       | Broad — covers all major features shallowly          | Narrow — covers one specific area deeply                 |
| **Trigger**     | After every deployment or build                      | After a targeted code change or bug fix                   |
| **Question**    | "Is the whole system fundamentally working?"         | "Does this specific change work correctly?"              |

**WrightPay Sanity Testing Example:**

A developer fixes a bug where beneficiary deletion was not cascading correctly in PostgreSQL. Sanity testing would:

1. Verify the specific fix: delete a beneficiary and confirm cascade behavior
2. Verify related functionality: beneficiary list updates correctly, transfers to deleted beneficiary are rejected
3. Verify no regression in adjacent features: beneficiary creation and editing still work
4. Skip unrelated features: wallets, cards, exchange rates (covered by regression/smoke)

---

### 7.10 Exploratory Testing

**Purpose:** **Simultaneous learning, test design, and execution** — the tester actively explores the application without predefined scripts, using domain knowledge and intuition to discover unexpected behavior not covered by scripted test cases.

**WrightPay Exploratory Testing Focus Areas:**

| Area                              | Exploration Goals                                                                   |
|-----------------------------------|-------------------------------------------------------------------------------------|
| **Unusual user flows**            | Navigate features in unexpected order; skip expected steps                          |
| **Rapid navigation**             | Quickly switch between pages/features; click during loading states                  |
| **Unexpected input combinations** | Combine valid inputs in unusual ways; mix currencies, amounts, beneficiaries        |
| **Interrupted workflows**        | Close browser mid-transfer; lose network during submission; timeout during OTP      |
| **Session behavior**             | Open multiple tabs; login/logout in parallel; expired session interactions          |
| **Browser refresh / back-button** | Refresh during transfer confirmation; use back button after submission; bookmark protected pages |

Exploratory testing sessions will be **time-boxed** and **documented** with session charters, observations, and defects discovered.

---

### 7.11 API Contract Testing

**Purpose:** Verify that API requests and responses conform to the **documented and implemented backend contract**, ensuring stability and backward compatibility.

**Contract Verification Areas:**

| Contract Element          | Verification                                                                        |
|---------------------------|-------------------------------------------------------------------------------------|
| **Request schema**        | Required fields, optional fields, data types, nested objects match expected schema  |
| **Response schema**       | Response body structure, field names, data types, nested objects match contract     |
| **Status codes**          | Each endpoint returns the correct status codes for success, error, and edge cases   |
| **Headers**               | Content-Type, Authorization, CORS, cache-control headers present and correct        |
| **Error structure**       | Error responses follow a consistent envelope format with code, message, and details |
| **Required vs. optional** | Required fields trigger errors when missing; optional fields have correct defaults  |
| **Data types**            | Numeric fields return numbers, dates return ISO strings, IDs return UUIDs           |

---

### 7.12 Authentication Testing

**Purpose:** Verify that WrightPay's authentication mechanisms correctly identify and validate users, and that unauthenticated access is prevented.

**Coverage Areas:**

| Authentication Area              | Test Focus                                                                        |
|----------------------------------|-----------------------------------------------------------------------------------|
| **Signup**                       | Registration with valid data, duplicate email rejection, validation enforcement   |
| **Login**                        | Valid credential authentication, invalid credential rejection, rate limiting      |
| **Logout**                       | Session/token invalidation, post-logout access rejection                         |
| **Email verification**           | Verification flow completion, invalid/expired verification token handling        |
| **JWT issuance**                 | Token contains correct claims, proper expiry, secure signing                     |
| **JWT expiration**               | Expired tokens are rejected; refresh flow works correctly                         |
| **Invalid / modified tokens**    | Tampered tokens rejected; tokens with invalid signature rejected; algorithm confusion prevented |
| **Session behavior**             | Concurrent sessions, session timeout, session persistence across browser restarts |

---

### 7.13 Authorization Testing

**Purpose:** Verify that authenticated users can access **only the resources they are permitted to access**. Authorization testing focuses on horizontal privilege escalation and resource-level access control.

**WrightPay Authorization Testing Focus:**

| Authorization Scenario                   | Test Approach                                                                     |
|------------------------------------------|-----------------------------------------------------------------------------------|
| **Horizontal privilege escalation**      | User A attempts to access User B's resources by manipulating resource IDs         |
| **IDOR / BOLA**                          | Systematically test all parameterized endpoints with IDs belonging to other users |
| **Cross-user wallet access**             | Authenticate as User A; request User B's wallet by ID → must be rejected          |
| **Cross-user transaction access**        | Authenticate as User A; request User B's transactions → must be rejected          |
| **Cross-user card access**               | Authenticate as User A; request User B's card details → must be rejected          |
| **Cross-user beneficiary access**        | Authenticate as User A; modify/delete User B's beneficiary → must be rejected     |

> **Critical:** Every endpoint that accepts a resource ID (wallet ID, transaction ID, card ID, beneficiary ID, transfer ID) must be tested for IDOR/BOLA vulnerabilities. Failure in this area is a **critical security defect**.

---

### 7.14 Security Testing

**Purpose:** Evaluate WrightPay's overall security posture by testing for common vulnerabilities, misconfigurations, and abuse scenarios across all application layers.

**Security Testing Coverage:**

| Security Area                  | Testing Focus                                                                          |
|--------------------------------|----------------------------------------------------------------------------------------|
| **Authentication**             | Credential handling, brute-force protection, session management (see §7.12)            |
| **Authorization**              | IDOR/BOLA, privilege escalation, resource isolation (see §7.13)                         |
| **IDOR / BOLA**                | All parameterized endpoints tested with cross-user resource IDs                        |
| **Injection**                  | SQL injection on all user-controlled inputs; parameterized query verification          |
| **XSS**                        | Reflected, stored, and DOM-based cross-site scripting in all text inputs and rendered content |
| **CORS**                       | Allowed origins, preflight handling, credentialed request policy enforcement            |
| **Rate limiting**              | Throttle enforcement on login, transfer, OTP, and sensitive endpoints                  |
| **Sensitive-data exposure**    | Passwords, tokens, PII never leaked in responses, logs, URLs, or error messages        |
| **Token security**             | JWT signing, validation, storage (httpOnly cookies vs. localStorage), transmission     |
| **OTP security**               | OTP brute-force prevention, OTP reuse prevention, timing attack mitigation             |
| **Abuse / misuse scenarios**   | Automated account creation, mass transfer attempts, API scraping, enumeration attacks  |

---

### 7.15 Financial Integrity Testing

**Purpose:** A **dedicated WrightPay testing type** that verifies the correctness and safety of all financial operations. Financial integrity is the highest-priority quality attribute for a payment application.

**Financial Integrity Verification Areas:**

| Area                                  | Verification                                                                             |
|---------------------------------------|------------------------------------------------------------------------------------------|
| **Wallet balances**                   | Balance accurately reflects all completed debits and credits                             |
| **Debits / credits**                  | Source wallet debited by exact transfer amount; destination wallet credited correctly     |
| **Fees**                              | Fee calculations are arithmetically correct; fees deducted from correct account          |
| **Exchange conversions**              | Exchange rate applied correctly; converted amounts are arithmetically accurate            |
| **Transaction records**               | Every financial operation produces an accurate, immutable transaction record              |
| **No duplicate financial operations** | Idempotency prevents double-debits, double-credits, and duplicate transfers              |
| **No lost financial operations**      | Every initiated transfer either completes or fails; no transfers lost silently            |
| **API ↔ PostgreSQL consistency**      | API-reported balances and transaction data match PostgreSQL records exactly               |
| **Atomicity**                         | Multi-step financial operations (debit + credit + record) commit or roll back as a unit  |
| **Rollback behavior**                 | Failed transfers leave zero financial side effects; balances return to pre-operation state |

---

### 7.16 Data Integrity Testing

**Purpose:** Verify the **consistency, accuracy, and completeness** of data as it flows through the entire system, from user input to persistent storage.

**Data Flow Verification:**

```
Frontend (User Input)  →  API (Request/Response)  →  PostgreSQL (Persistence)
                                                  →  Redis (Cache/Idempotency)
                                                  →  BullMQ (Job Data)
```

| Verification Point                         | What Is Checked                                                                  |
|--------------------------------------------|----------------------------------------------------------------------------------|
| **Frontend → API**                         | Form data is transmitted correctly; no data loss or mutation in transit           |
| **API → PostgreSQL**                       | Data written to database matches API request; no truncation or type coercion     |
| **API response → PostgreSQL**              | Data returned by API matches what is stored in PostgreSQL                        |
| **API → Redis**                            | Idempotency keys, cache entries, and lock data are stored correctly              |
| **API → BullMQ**                           | Job payload contains correct transfer data; no data loss in queue                |
| **Cross-layer consistency**                | Data displayed in UI, returned by API, and stored in PostgreSQL is consistent    |

---

### 7.17 Transaction / ACID Testing

**Purpose:** Verify that database operations, especially financial operations, maintain appropriate **ACID transactional properties**.

**ACID Verification in WrightPay:**

| Property          | Verification                                                                                    |
|-------------------|-------------------------------------------------------------------------------------------------|
| **Atomicity**     | Multi-step operations (debit source + credit destination + create transaction record) either all succeed or all fail; no partial state |
| **Consistency**   | Database constraints (NOT NULL, UNIQUE, CHECK, FK) are enforced before and after every transaction; financial invariants hold |
| **Isolation**     | Concurrent transfers against the same wallet do not interfere; no dirty reads, non-repeatable reads, or phantom reads affecting financial data |
| **Durability**    | Committed transactions survive process crashes, restarts, and infrastructure failures           |

**Primary Test Scenario:** The **transfer workflow** is the primary ACID testing target:

```
BEGIN TRANSACTION
  1. Verify sufficient balance (read source wallet)
  2. Debit source wallet
  3. Credit destination wallet
  4. Create transaction record(s)
  5. Update transfer status
COMMIT  ← all succeed
ROLLBACK ← any failure reverts all steps
```

---

### 7.18 Concurrency Testing

**Purpose:** Test the system's behavior when **multiple operations occur simultaneously**, particularly operations that contend for shared resources.

**WrightPay Concurrency Scenarios:**

| Scenario                                    | Risk                                                  | Expected Behavior                              |
|---------------------------------------------|-------------------------------------------------------|------------------------------------------------|
| **Two transfers from the same wallet**      | Race condition, double-debit, incorrect balance       | Serialized via locking; both or one succeeds with correct balance |
| **Duplicate transfer requests**             | Double-processing, duplicate financial operations     | Idempotency key prevents duplicate processing  |
| **Simultaneous card state changes**         | Inconsistent card state                               | Only one change succeeds; state remains valid  |
| **Concurrent API requests (same user)**     | Data corruption, race conditions                      | All requests handled correctly; data consistent |
| **Concurrent API requests (different users)** | Cross-user data leakage, incorrect isolation       | Complete user isolation maintained              |

**Infrastructure Connections:**

| Infrastructure Component | Concurrency Role                                                           |
|--------------------------|----------------------------------------------------------------------------|
| **PostgreSQL locking**   | Row-level locks and transaction isolation prevent concurrent write conflicts |
| **Redis idempotency**    | Idempotency keys prevent duplicate transfer processing                      |
| **BullMQ processing**    | Job queue serialization and deduplication prevent concurrent processing of the same transfer |

---

### 7.19 Reliability / Failure Testing

**Purpose:** Test system behavior when **dependencies or operations fail**, verifying graceful degradation, correct error reporting, and data consistency.

**WrightPay Failure Scenarios:**

| Failure Scenario                    | Test Focus                                                                              |
|-------------------------------------|-----------------------------------------------------------------------------------------|
| **API failure**                     | Frontend handles API errors gracefully; displays meaningful error messages               |
| **Database failure**                | API returns appropriate errors; no data corruption; reconnects after recovery            |
| **Redis failure**                   | Application degrades gracefully; idempotency may be temporarily unavailable; no data loss |
| **Queue / worker failure**          | Jobs are retried or failed gracefully; no duplicate or lost financial operations         |
| **Network interruption**            | Frontend handles network loss; retries or displays error; no silent data loss            |
| **Failed transfer processing**      | Transfer marked as FAILED; source wallet balance restored; no partial debit/credit      |

All failure scenarios must verify **correct recovery and data consistency** — the system must never leave financial data in an inconsistent state after a failure.

---

### 7.20 Recovery Testing

**Purpose:** Verify that the system can **recover safely after failures** without introducing financial or data inconsistencies.

**Recovery Safety Guarantees:**

| Recovery Requirement                      | Verification                                                                      |
|-------------------------------------------|-----------------------------------------------------------------------------------|
| **No duplicate financial operations**     | After recovery from mid-transfer failure, the transfer is not processed twice     |
| **No corrupted balances**                 | Wallet balances are arithmetically correct after failure and recovery              |
| **No orphaned transactions**              | Every transaction record maps to a real financial operation; no phantom records   |
| **No inconsistent state**                 | API, database, Redis, and BullMQ state are consistent after recovery              |

**Recovery Test Approach:**

1. Initiate a financial operation (e.g., transfer)
2. Inject a failure at a specific point (e.g., worker crash after debit, before credit)
3. Allow the system to recover (retry, restart)
4. Verify that financial state is consistent and correct

---

### 7.21 Performance Testing

**Purpose:** Verify that WrightPay meets acceptable performance thresholds under various load conditions.

**Performance Testing Coverage:**

| Area                              | Metrics                                                                           |
|-----------------------------------|-----------------------------------------------------------------------------------|
| **Response time**                 | P50, P95, P99 latency for critical API endpoints                                 |
| **Throughput**                    | Maximum requests per second before degradation                                    |
| **Concurrent users / requests**   | System behavior under 10, 50, 100, 500+ concurrent users                         |
| **Transfer processing latency**   | End-to-end time from transfer initiation to completion (including BullMQ)        |
| **Database under load**           | Query performance, connection pool behavior, lock contention under load          |
| **Redis / BullMQ under load**     | Cache hit rates, idempotency check latency, job queue depth, processing rate     |

**Performance Testing Types (Planned):**

| Performance Test Type | Purpose                                                                          |
|-----------------------|----------------------------------------------------------------------------------|
| **Load testing**      | Verify system behavior under expected normal and peak load                       |
| **Stress testing**    | Identify the system's breaking point by increasing load beyond expected capacity  |
| **Spike testing**     | Verify system behavior under sudden, sharp increases in load                     |
| **Soak testing**      | Verify system stability and resource consumption under sustained load over time  |

Detailed performance testing strategy, benchmarks, and SLAs will be defined in a dedicated Performance Strategy section.

---

### 7.22 Usability Testing

**Purpose:** Evaluate the **ease of use and clarity** of the WrightPay user interface, ensuring that users can complete financial operations confidently and without confusion.

**Usability Evaluation Areas:**

| Area                              | Evaluation Focus                                                                  |
|-----------------------------------|-----------------------------------------------------------------------------------|
| **Workflow clarity**              | Can users complete transfers, beneficiary creation, and card management intuitively? |
| **Error-message clarity**         | Are error messages specific, actionable, and non-technical?                       |
| **Navigation**                    | Is navigation logical? Can users find features without guidance?                  |
| **Form usability**                | Are forms well-labeled, logically ordered, and forgiving of minor input errors?   |
| **Transfer confirmation clarity** | Is the transfer summary clear? Are amount, beneficiary, currency, and fees unambiguous before submission? |

---

### 7.23 Accessibility Testing

**Purpose:** Verify that WrightPay is **usable by people with disabilities**, following web accessibility best practices.

**Accessibility Testing Coverage:**

| Area                          | Verification                                                                        |
|-------------------------------|-------------------------------------------------------------------------------------|
| **Keyboard navigation**       | All interactive elements are reachable and operable via keyboard alone             |
| **Focus behavior**            | Focus order is logical; focus is visible; focus is managed correctly on page changes |
| **Semantic HTML**              | Correct use of headings, landmarks, lists, buttons, and form elements              |
| **Labels**                     | All form inputs have associated labels; all images have alt text                   |
| **Accessible names**           | All interactive elements have meaningful accessible names                          |
| **Color contrast**             | Text and interactive elements meet WCAG contrast requirements                      |
| **Screen-reader compatibility** | Critical workflows are navigable and understandable via screen reader where applicable |

---

### 7.24 Compatibility / Cross-Browser Testing

**Purpose:** Verify that WrightPay functions correctly and renders consistently across **supported browsers and viewport sizes**.

**Coverage:**

| Area                  | Testing Approach                                                                     |
|-----------------------|--------------------------------------------------------------------------------------|
| **Desktop browsers**  | Test on supported desktop browsers (specific browser matrix to be defined)           |
| **Mobile browsers**   | Test on supported mobile browsers (specific browser matrix to be defined)            |
| **Responsive layout** | Verify layout at desktop, tablet, and mobile viewport breakpoints                    |
| **Feature parity**    | Verify that core functionality works consistently across all supported browsers      |

> **Note:** The specific supported browser matrix (browser names and minimum versions) will be defined in a subsequent Phase 0 activity in coordination with project stakeholders.

---

### 7.25 Observability Testing

**Purpose:** Verify that failures and important operations produce **useful diagnostic output** that supports debugging, monitoring, and incident response.

**Observability Verification:**

| Area                              | Verification                                                                        |
|-----------------------------------|-------------------------------------------------------------------------------------|
| **Application logs**              | Errors, warnings, and critical operations are logged with sufficient context        |
| **API errors**                    | API error responses include a correlation ID or error code for tracing              |
| **Worker / queue logs**           | BullMQ job failures, retries, and completions are logged with job IDs              |
| **Database diagnostics**          | Slow queries, connection failures, and constraint violations are logged where available |
| **No sensitive data in logs**     | Passwords, tokens, PII, financial details are **never** included in log output     |

---

### 7.26 Resilience Testing

**Purpose:** Evaluate WrightPay's ability to **continue operating or recover safely** when dependencies become unavailable or unstable. Resilience testing goes beyond normal functional testing by intentionally degrading the environment.

**How resilience testing differs from functional testing:**

| Aspect               | Functional Testing                          | Resilience Testing                                          |
|-----------------------|---------------------------------------------|-------------------------------------------------------------|
| **Environment**       | All dependencies healthy and available      | One or more dependencies degraded or unavailable            |
| **Focus**             | Correct behavior under normal conditions    | Safe behavior under abnormal conditions                     |
| **Goal**              | Verify features work                        | Verify system doesn't lose data, corrupt state, or crash    |

**WrightPay Resilience Scenarios:**

| Dependency             | Degradation Scenario                                | Expected Behavior                                       |
|------------------------|-----------------------------------------------------|---------------------------------------------------------|
| **PostgreSQL**         | Database unavailable or responding slowly           | API returns appropriate errors; no data corruption       |
| **Redis**              | Redis unavailable or intermittently timing out      | Graceful degradation; transfers may be delayed, not lost |
| **BullMQ**             | Worker process crashed or queue is backed up         | Jobs are retried after recovery; no duplicate processing |
| **Network / API**      | Network latency or intermittent connectivity        | Frontend handles gracefully; no silent data loss         |

---

### 7.27 Production Smoke Testing

**Purpose:** Define a **safe production smoke suite** that verifies critical functionality after deployment without destructive actions against real user data.

**Production Smoke Checks:**

| Check                                    | Verification                                                            |
|------------------------------------------|-------------------------------------------------------------------------|
| Frontend loads and renders               | Vercel-hosted application is accessible and renders correctly           |
| Backend health check passes              | Render-hosted API responds to health endpoint                           |
| Authentication flow completes            | Login with test account succeeds; JWT issued                            |
| Wallet API responds correctly            | Authenticated wallet request returns valid data                         |
| Transfer API is available                | Transfer endpoint accepts requests (tested with safe test data)         |
| Transaction history loads                | Transaction list endpoint returns data for test account                 |
| Exchange-rate API responds               | Rate endpoint returns current rates                                     |

**Production Smoke Safety Rules:**

> **⚠️ Critical Constraints:**
>
> - Production smoke tests **must use dedicated, safe test data and test accounts** — never real user accounts.
> - **No destructive database operations** — no deletes, no bulk updates, no schema changes.
> - **No intentional failure injection in production** — resilience testing is performed in non-production environments only.
> - Production smoke tests are designed to **verify** operational health, not to **stress** or **break** the production system.

---

### 7.28 Testing-Type Summary Matrix

| Testing Type             | Primary Purpose                           | WrightPay Examples                               | Main Testing Levels               |
|--------------------------|-------------------------------------------|--------------------------------------------------|-----------------------------------|
| **Functional**           | Verify intended behavior                  | Transfers, wallets, beneficiaries, cards          | All                               |
| **Positive**             | Verify valid/happy-path behavior          | Valid transfer, valid login                       | API / E2E                         |
| **Negative**             | Verify invalid/error behavior             | Insufficient balance, invalid credentials        | API / E2E                         |
| **Boundary**             | Verify limits and edge values             | Amount limits, balance boundaries, pagination    | Unit / API / E2E                  |
| **Validation**           | Verify input rejection                    | Required fields, formats, types, ranges          | Unit / API                        |
| **Business-Rule**        | Verify domain-specific rules              | Transfer rules, ownership, idempotency           | Unit / API / Integration          |
| **Regression**           | Detect unintended breakage                | Critical workflows after code changes            | All                               |
| **Smoke**                | Verify system is fundamentally working    | Login, dashboard, key APIs                        | E2E / API                         |
| **Sanity**               | Verify targeted change works              | Specific bug fix + surrounding features           | Varies                            |
| **Exploratory**          | Discover unexpected behavior              | Unusual flows, interrupted workflows              | E2E / Manual                      |
| **API Contract**         | Verify API schema stability               | Request/response schemas, status codes            | API                               |
| **Authentication**       | Verify identity mechanisms                | Login, JWT, OTP, session management               | API / E2E                         |
| **Authorization**        | Verify access control                     | IDOR/BOLA, cross-user access                      | API / E2E                         |
| **Security**             | Find security weaknesses                  | Injection, XSS, CORS, rate limiting              | API / E2E                         |
| **Financial Integrity**  | Protect money/state correctness           | Balances, transfers, atomicity, idempotency      | API / DB / Integration / E2E      |
| **Data Integrity**       | Verify data consistency across layers     | Frontend ↔ API ↔ PostgreSQL ↔ Redis              | Integration / API / DB            |
| **Transaction / ACID**   | Verify database transactional properties  | Transfer atomicity, rollback, isolation           | Integration / DB                  |
| **Concurrency**          | Verify simultaneous operations            | Concurrent transfers, duplicate requests         | Integration / API / DB            |
| **Reliability / Failure**| Verify failure behavior                   | Redis/DB/worker failures, network interruption   | Integration / System              |
| **Recovery**             | Verify safe recovery after failure        | Post-crash consistency, no duplicate operations   | Integration / System              |
| **Performance**          | Verify behavior under load                | Concurrent transfers, throughput, latency        | API / System                      |
| **Usability**            | Verify ease of use                        | Workflow clarity, error messages, navigation     | E2E / Manual                      |
| **Accessibility**        | Verify accessible UI                      | Keyboard nav, labels, contrast, screen reader    | E2E / Manual                      |
| **Compatibility**        | Verify supported environments             | Browsers, viewports, responsive layout           | E2E / Manual                      |
| **Observability**        | Verify diagnostic output                  | Logs, error codes, worker diagnostics            | Integration / System              |
| **Resilience**           | Verify behavior under degradation         | Dependency unavailability, partial failures      | Integration / System              |
| **Production Smoke**     | Verify production deployment health       | Critical production journeys with safe data      | E2E / API (Production)            |

---

### 7.29 WrightPay Testing-Type Strategy

#### Risk-Based Application of Testing Types

Testing types will be applied **based on business risk** rather than mechanically creating an independent, isolated test suite for every type. Test design will prioritize the areas where defects pose the greatest threat to users, financial correctness, and system reliability.

#### Overlapping Coverage for High-Risk Functionality

High-risk functionality — specifically **authentication, authorization, wallet balances, transactions, and transfers** — will receive **multiple overlapping testing types** to maximize defect detection.

**Example — Transfer Test Overlap:**

A single transfer test scenario may simultaneously satisfy **multiple testing types**:

```
Transfer: "Authenticated user transfers $100 to a valid beneficiary"

This test is simultaneously:

  ✓ Functional           — verifies transfer completes correctly
  ✓ Positive             — uses valid inputs and expected workflow
  ✓ Financial Integrity  — verifies balances, debit/credit accuracy
  ✓ Authorization        — verifies user owns source wallet
  ✓ Data Integrity       — verifies API response matches database state
  ✓ Concurrency          — (when run concurrently with other transfers)
  ✓ API                  — validates HTTP contract and response
  ✓ Database             — verifies PostgreSQL records post-transfer
  ✓ E2E                  — (when executed through the browser)
```

This overlap is **intentional and desirable** — it means a single well-designed test provides value across multiple quality dimensions, and a defect in any dimension will be caught.

#### Testing-Type Priority Tiers

| Priority | Testing Types                                                                | Rationale                                            |
|----------|------------------------------------------------------------------------------|------------------------------------------------------|
| **P0 — Critical** | Financial Integrity, Authentication, Authorization, Security         | Direct impact on money and user safety               |
| **P1 — High**     | Functional, Negative, Concurrency, Data Integrity, Transaction/ACID  | Core correctness and consistency                     |
| **P2 — Medium**   | Regression, API Contract, Validation, Business-Rule, Reliability     | Stability and contract compliance                    |
| **P3 — Standard** | Smoke, Sanity, Performance, Exploratory, Recovery, Resilience        | Operational confidence and discovery                 |
| **P4 — Supporting** | Usability, Accessibility, Compatibility, Observability             | User experience and supportability                   |

---

## Document Status

**Version 1.0** represents the **initial QA strategy baseline** for the WrightPay project. This document establishes the foundational sections: document control, project overview, testing objectives, testing scope, system under test, testing levels, and testing types.

The following sections will be added in **subsequent Phase 0 activities**:

| Planned Section                     | Description                                                           |
|-------------------------------------|-----------------------------------------------------------------------|
| Risk-Based Testing                  | Risk assessment matrix and risk-driven test prioritization            |
| Environments                        | Environment definitions, configurations, and management               |
| Test Data                           | Test data strategy, generation, seeding, and cleanup                  |
| Defect Management                   | Defect lifecycle, severity/priority definitions, triage process       |
| Automation Strategy                 | Framework selection, architecture, patterns, and coverage targets     |
| Performance Strategy                | Performance test approach, tooling, benchmarks, and SLAs              |
| Security Strategy                   | Security test methodology, tools, and OWASP alignment                |
| Entry / Exit Criteria               | Criteria for entering and exiting each test phase                     |
| Quality Gates                       | Defined gates for CI/CD pipeline and release process                  |
| Deliverables                        | QA artifacts, reports, and documentation deliverables                 |
| Roles and Responsibilities          | QA team structure and RACI matrix                                     |
| Risks and Mitigations               | QA program risks and mitigation strategies                            |
| Final Release Sign-Off Criteria     | Comprehensive checklist for production release approval               |

---

*End of WrightPay Master Test Strategy — Version 1.0*


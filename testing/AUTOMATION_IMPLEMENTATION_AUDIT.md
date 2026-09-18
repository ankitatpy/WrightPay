# WrightPay Automation Implementation Audit

**Date:** 2026-09-17  
**Auditor:** SDET Principal Automation Team  
**Scope:** Complete repository audit of WrightPay (Frontend, Backend, Database, Cache/Queues, Test Scaffolding, and CI/CD Readiness) against `qa/WrightPay_Master_Test_Strategy.md`.  
**Status:** READ-ONLY AUDIT COMPLETE (No code, configurations, or test files modified)

---

## 1. Current Repository Structure

The WrightPay codebase is organized as a multi-tier repository consisting of a Next.js frontend, a NestJS backend, and a dedicated QA automation directory. It does not use an npm/yarn/pnpm monorepo workspace configuration; each tier maintains its own isolated `package.json`, `node_modules`, and configuration files.

```
WrightPay/
├── .env.example                               # Root environment configuration template
├── README.md                                  # Repository overview and quick start
├── test_db.ts                                 # Standalone TypeORM connection test script
│
├── backend/                                   # NestJS REST API application (Port 3001)
│   ├── .env                                   # Local development backend environment variables
│   ├── .env.example                           # Backend environment template
│   ├── docker-compose.yml                     # Docker services for PostgreSQL 15 and Redis 7
│   ├── nest-cli.json                          # NestJS CLI configuration
│   ├── package.json                           # Backend dependencies & npm scripts
│   ├── tsconfig.json                          # TypeScript configuration
│   ├── tsconfig.build.json                    # NestJS build TypeScript config
│   ├── jest.config.js                         # Jest unit test configuration
│   ├── docs/                                  # Architectural & API mapping documentation
│   │   ├── api.md                             # REST API summary
│   │   ├── architecture.md                    # Backend architecture summary
│   │   └── frontend-backend-mapping.md        # UI to API endpoint mapping
│   ├── test/                                  # NestJS e2e testing directory
│   │   └── jest-e2e.json                      # E2E Jest configuration (No tests currently present)
│   └── src/
│       ├── main.ts                            # Application entry point, global prefix 'api/v1', CORS, Swagger
│       ├── app.module.ts                      # Root NestJS module importing TypeORM, BullMQ, Redis, Feature modules
│       ├── app.controller.ts                  # Root controller (GET /api/v1)
│       ├── app.service.ts                     # Root service
│       ├── core/                              # Shared application core
│       │   ├── decorators/
│       │   │   └── current-user.decorator.ts  # Extracts authenticated user payload from request
│       │   ├── enums/
│       │   │   └── currency.enum.ts           # Supported currencies: EUR, GBP, USD, AED, PLN, INR
│       │   ├── guards/
│       │   │   └── jwt-auth.guard.ts          # Bearer JWT verification guard
│       │   └── redis/
│       │       ├── redis.module.ts            # Global Redis module
│       │       └── redis.service.ts           # ioredis client wrapper (get, set, del, ttl)
│       ├── database/
│       │   └── seed/
│       │       └── seed.ts                    # Idempotent database truncation and seeding script
│       └── modules/
│           ├── auth/                          # Signup, Login, Email Verification, Logout
│           ├── users/                         # User profile (/users/me)
│           ├── wallets/                       # Wallets & multi-currency balance equivalents
│           ├── cards/                         # Card tokenization, freeze, unfreeze, deactivate
│           ├── beneficiaries/                 # Beneficiary management (strict max 3, UPI/Bank rules)
│           ├── exchange-rates/                # Public exchange rates & triangular quote engine
│           ├── transactions/                  # Transaction history, search, and pagination
│           └── transfers/                     # Transfer orchestration, Redis idempotency, BullMQ queue/worker
│
├── frontend/                                  # Next.js 16 / React 19 Client (Port 3000)
│   ├── .env.example                           # Frontend environment template
│   ├── .env.local                             # Local frontend env (NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1)
│   ├── package.json                           # Next.js, React 19, Tailwind CSS 4 dependencies
│   ├── next.config.ts                         # Next.js configuration
│   ├── postcss.config.mjs                     # PostCSS configuration
│   ├── app/                                   # Next.js App Router
│   │   ├── page.tsx                           # Landing page
│   │   ├── login/page.tsx                     # Authentication login form
│   │   ├── signup/page.tsx                    # Registration form
│   │   ├── verify-email/page.tsx              # OTP verification page (dev code: 123456)
│   │   ├── onboarding/page.tsx                # Client-only KYC mock flow (Demo UI)
│   │   ├── admin/page.tsx                     # Internal admin UI placeholder
│   │   ├── compliance/page.tsx                # Compliance review UI placeholder
│   │   ├── operations/page.tsx                # Operations dashboard UI placeholder
│   │   └── dashboard/                         # Main application authenticated routes
│   │       ├── page.tsx                       # Dashboard overview (wallet, balances, recent txns)
│   │       ├── beneficiaries/page.tsx         # Beneficiary list and modal
│   │       ├── cards/page.tsx                 # Card management UI
│   │       ├── profile/page.tsx               # Profile view & update form
│   │       ├── send-money/page.tsx            # Multi-step transfer wizard with real-time polling
│   │       ├── transactions/page.tsx          # Paginated transaction ledger
│   │       └── wallets/page.tsx               # Multi-currency equivalent cards
│   ├── components/                            # Reusable React components (DashboardLayout, WalletCard, etc.)
│   ├── lib/                                   # Client libraries, Contexts, and API client
│   │   ├── api.ts                             # Fetch API client with Bearer token & Idempotency-Key headers
│   │   ├── auth-context.tsx                   # AuthProvider React context managing JWT session in localStorage
│   │   ├── formatting.ts                      # Currency and date formatters
│   │   ├── api/                               # Domain API client adapters (calls backend /api/v1/*)
│   │   └── mock/                              # Legacy client mock files
│   └── test-data/                             # Legacy static JSON mocks
│
├── qa/                                        # QA Assets & Documentation
│   ├── WrightPay_Master_Test_Strategy.md      # Master Test Strategy baseline (1,339 lines)
│   ├── risk/
│   │   ├── WrightPay_Risk_Register.md         # Comprehensive Risk Register
│   │   └── WrightPay_Risk_Register_Review.md  # Risk Review & Prioritization document
│   └── automation/                            # Existing Playwright framework skeleton
│       ├── .env.example                       # Test environment configuration template
│       ├── package.json                       # Playwright test dependencies
│       ├── playwright.config.ts               # Playwright test runner configuration
│       ├── tsconfig.json                      # Automation TypeScript configuration
│       ├── config/
│       │   └── env.config.ts                  # Automation environment loader
│       ├── reports/                           # HTML & JSON test reports and traces
│       ├── tests/                             # Test directories (skeleton .gitkeep files)
│       │   └── proof-of-life.spec.ts          # Baseline passing test confirming runner execution
│       ├── api/, fixtures/, pages/, utils/, database/, queues/, redis/, test-data/ (Skeletons)
│
└── docs/                                      # Phase 4 deployment checklists and architecture specs
```

---

## 2. Backend API Inventory

The NestJS backend sets a global route prefix of `api/v1` in [main.ts](file:///Users/ankitpandey/Desktop/projects/WrightPay/backend/src/main.ts#L30). All endpoints below are prefixed with `/api/v1`.

### Summary Inventory Table

| Domain | Method | Endpoint | Auth | Request Body / Params | Success Response | DB Side Effect | Queue/Redis Side Effect |
|---|---|---|---|---|---|---|---|
| **Root** | `GET` | `/` | None | None | `200 OK` (string: "Hello World!") | None | None |
| **Auth** | `POST` | `/auth/signup` | None | JSON: `SignupDto` | `201 Created` (`{ message, userId }`) | Inserts 1 `User` (`PENDING`), 1 default `Wallet` (`EUR`, 0 balance), 1 `EmailVerification` | None |
| **Auth** | `POST` | `/auth/login` | None | JSON: `LoginDto` | `200 OK` (`{ access_token, user }`) | None | None |
| **Auth** | `POST` | `/auth/verify-email` | None | JSON: `VerifyEmailDto` | `200 OK` (`{ message }`) | Updates `EmailVerification.isVerified = true`, updates `User.accountStatus = ACTIVE` | None |
| **Auth** | `POST` | `/auth/logout` | Bearer JWT | None | `200 OK` (`{ message }`) | None | None (Client-side token deletion) |
| **Users** | `GET` | `/users/me` | Bearer JWT | None | `200 OK` (`User` profile JSON) | None | None |
| **Users** | `PATCH` | `/users/me` | Bearer JWT | JSON: `UpdateUserDto` | `200 OK` (Updated `User` profile) | Updates `User` fields (`name`, `countryOfResidence`, `defaultCurrency`) | None |
| **Wallets** | `GET` | `/wallets/me` | Bearer JWT | None | `200 OK` (`WalletResponse` with equivalents) | None | None |
| **Cards** | `GET` | `/cards` | Bearer JWT | None | `200 OK` (`Card[]`) | None | None |
| **Cards** | `POST` | `/cards` | Bearer JWT | JSON: `CreateCardDto` | `201 Created` (`Card`) | Inserts `Card` (`status: ACTIVE`, PAN/CVV discarded, stores last 4) | None |
| **Cards** | `POST` | `/cards/:id/freeze` | Bearer JWT | Path: `:id` (UUID) | `200 OK` (`Card`) | Updates `Card.status = FROZEN` | None |
| **Cards** | `POST` | `/cards/:id/unfreeze` | Bearer JWT | Path: `:id` (UUID) | `200 OK` (`Card`) | Updates `Card.status = ACTIVE` | None |
| **Cards** | `POST` | `/cards/:id/deactivate` | Bearer JWT | Path: `:id` (UUID) | `200 OK` (`Card`) | Updates `Card.status = DEACTIVATED` | None |
| **Cards** | `DELETE` | `/cards/:id` | Bearer JWT | Path: `:id` (UUID) | `200 OK` (`{ message, id }`) | Deletes `Card` row (hard delete) | None |
| **Beneficiaries** | `GET` | `/beneficiaries` | Bearer JWT | None | `200 OK` (`Beneficiary[]`) | None | None |
| **Beneficiaries** | `POST` | `/beneficiaries` | Bearer JWT | JSON: `CreateBeneficiaryDto` | `201 Created` (`Beneficiary`) | Inserts `Beneficiary` (checks max 3 active) | None |
| **Beneficiaries** | `DELETE` | `/beneficiaries/:id` | Bearer JWT | Path: `:id` (UUID) | `200 OK` (`{ message, id }`) | Updates `Beneficiary.deletedAt = NOW()` (soft delete) | None |
| **Transfers** | `POST` | `/transfers` | Bearer JWT + `Idempotency-Key` Header | JSON: `CreateTransferDto` | `201 Created` (`TransferResult`) | Deducts `Wallet.balance`, inserts `Transaction` (`status: PENDING`) | Sets Redis idempotency lock (`SET NX EX 60`), then updates to `COMPLETED` (`EX 86400`); enqueues BullMQ job on `transfers` queue |
| **Transactions** | `GET` | `/transactions` | Bearer JWT | Query: `GetTransactionsDto` | `200 OK` (`PaginatedTransactionsResponse`) | None | None |
| **Transactions** | `GET` | `/transactions/:id` | Bearer JWT | Path: `:id` (UUID) | `200 OK` (`FormattedTransaction`) | None | None |
| **Exchange Rates**| `GET` | `/exchange-rates` | None | None | `200 OK` (`ExchangeRate[]`) | None | None |
| **Exchange Rates**| `GET` | `/exchange-rates/quote`| None | Query: `GetQuoteDto` | `200 OK` (`ExchangeQuote`) | None | None |

---

### Detailed Endpoint Specifications

#### 1. POST `/api/v1/auth/signup`
- **Method:** `POST`
- **Route:** `/api/v1/auth/signup`
- **Auth:** None (Public)
- **Request Body:**
  ```json
  {
    "firstName": "Anna",
    "lastName": "Kowalski",
    "email": "anna@example.com",
    "password": "Password123!",
    "agreeTerms": true
  }
  ```
- **Validation Rules (`SignupDto`):**
  - `firstName`: `@IsString()`, `@IsNotEmpty()`
  - `lastName`: `@IsString()`, `@IsNotEmpty()`
  - `email`: `@IsEmail()`
  - `password`: `@IsString()`, `@MinLength(8)`
  - `agreeTerms`: `@IsBoolean()`
- **Success Status Code:** `201 Created`
- **Response Structure:**
  ```json
  {
    "message": "Signup successful. Please verify your email.",
    "userId": "uuid-v4-string"
  }
  ```
- **Business Rules:**
  - Lowercases email; rejects with `400 Bad Request` (`Email already in use`) if email exists.
  - Hashes password using `argon2`.
  - Sets user `accountStatus = PENDING`, `kycStatus = NOT_STARTED`, `defaultCurrency = EUR`, `accountType = INDIVIDUAL`.
  - Automatically provisions a primary wallet with currency `EUR`, `balance = 0`, `isDefault = true`.
  - Generates a 6-digit OTP. In `NODE_ENV === 'development'`, code is hardcoded to `'123456'`, expiring in 15 minutes.
- **Side Effects:** Writes to `users`, `wallets`, and `email_verifications`.

#### 2. POST `/api/v1/auth/login`
- **Method:** `POST`
- **Route:** `/api/v1/auth/login`
- **Auth:** None (Public)
- **Request Body:**
  ```json
  {
    "email": "anna.kowalski@example.com",
    "password": "Password123!"
  }
  ```
- **Validation Rules (`LoginDto`):**
  - `email`: `@IsEmail()`
  - `password`: `@IsString()`, `@IsNotEmpty()`
- **Success Status Code:** `200 OK` (Explicit `@HttpCode(HttpStatus.OK)`)
- **Response Structure:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "email": "anna.kowalski@example.com",
      "name": "Anna Kowalski"
    }
  }
  ```
- **Business Rules:**
  - Verifies user exists and checks `argon2.verify(user.passwordHash, password)`. If invalid, throws `401 Unauthorized ('INVALID_CREDENTIALS')`.
  - Rejects `SUSPENDED` accounts with `401 Unauthorized ('ACCOUNT_SUSPENDED')`.
  - Rejects `CLOSED` accounts with `401 Unauthorized ('ACCOUNT_CLOSED')`.
  - **Notable Behavior:** Does *not* reject `PENDING` (unverified) accounts at login.
- **Side Effects:** None.

#### 3. POST `/api/v1/auth/verify-email`
- **Method:** `POST`
- **Route:** `/api/v1/auth/verify-email`
- **Auth:** None (Public)
- **Request Body:**
  ```json
  {
    "email": "anna@example.com",
    "code": "123456"
  }
  ```
- **Validation Rules (`VerifyEmailDto`):**
  - `email`: `@IsEmail()`
  - `code`: `@IsString()`, `@IsNotEmpty()`, `@Length(6, 6)`
- **Success Status Code:** `200 OK`
- **Response Structure:**
  ```json
  {
    "message": "Email successfully verified"
  }
  ```
- **Business Rules:**
  - Queries latest `email_verifications` record for email and code.
  - Rejects if record missing (`400 'INVALID_INPUT'`).
  - Rejects if already verified (`400 'Email is already verified'`).
  - Rejects if `new Date() > verification.expiresAt` (`400 'Verification code expired'`).
  - Updates `isVerified = true` and updates `user.accountStatus` from `PENDING` to `ACTIVE`.
- **Side Effects:** Updates `email_verifications` and `users` tables.

#### 4. POST `/api/v1/auth/logout`
- **Method:** `POST`
- **Route:** `/api/v1/auth/logout`
- **Auth:** Bearer JWT required (`JwtAuthGuard`)
- **Success Status Code:** `200 OK`
- **Response Structure:**
  ```json
  {
    "message": "Logged out successfully"
  }
  ```
- **Business Rules:** No server-side session/token blacklist in Redis is currently implemented. The token remains cryptographically valid until expiry; client is expected to discard the token.

#### 5. GET `/api/v1/users/me`
- **Method:** `GET`
- **Route:** `/api/v1/users/me`
- **Auth:** Bearer JWT required
- **Success Status Code:** `200 OK`
- **Response Structure:** Returns complete `User` entity (excluding `passwordHash` due to `@Column({ select: false })`).
- **Business Rules:** Resolves `userId` strictly from `req.user.id` extracted from the validated JWT token.

#### 6. PATCH `/api/v1/users/me`
- **Method:** `PATCH`
- **Route:** `/api/v1/users/me`
- **Auth:** Bearer JWT required
- **Request Body:**
  ```json
  {
    "name": "Anna Maria Kowalski",
    "countryOfResidence": "Poland",
    "defaultCurrency": "PLN"
  }
  ```
- **Validation Rules (`UpdateUserDto`):**
  - `name`: `@IsString()`, `@IsOptional()`
  - `countryOfResidence`: `@IsString()`, `@IsOptional()`
  - `defaultCurrency`: `@IsEnum(Currency)`, `@IsOptional()`
- **Success Status Code:** `200 OK`
- **Side Effects:** Updates `users` table row.

#### 7. GET `/api/v1/wallets/me`
- **Method:** `GET`
- **Route:** `/api/v1/wallets/me`
- **Auth:** Bearer JWT required
- **Success Status Code:** `200 OK`
- **Response Structure:**
  ```json
  {
    "id": "wallet-uuid",
    "currency": "EUR",
    "balance": 2500.00,
    "isDefault": true,
    "equivalents": {
      "EUR": 2500.00,
      "GBP": 2125.00,
      "USD": 2700.00,
      "AED": 9900.00,
      "PLN": 10750.00,
      "INR": 223750.00
    }
  }
  ```
- **Business Rules:**
  - Looks up user's default wallet (or any wallet owned by `userId`). Throws `404 Not Found` if missing.
  - Dynamically calculates cross-currency equivalent balances for all 6 supported currencies using `ExchangeRatesService.getRate()`.
  - Values are rounded to 2 decimal places using `Math.round((val + Number.EPSILON) * 100) / 100`.

#### 8. GET `/api/v1/cards`
- **Method:** `GET`
- **Route:** `/api/v1/cards`
- **Auth:** Bearer JWT required
- **Success Status Code:** `200 OK`
- **Response Structure:** Array of `Card` entities ordered by `createdAt DESC`.

#### 9. POST `/api/v1/cards`
- **Method:** `POST`
- **Route:** `/api/v1/cards`
- **Auth:** Bearer JWT required
- **Request Body:**
  ```json
  {
    "cardholderName": "ANNA KOWALSKI",
    "type": "debit",
    "cardNumber": "4242424242424242",
    "expiryDate": "12/28",
    "cvv": "123"
  }
  ```
- **Validation Rules (`CreateCardDto`):**
  - `cardholderName`: `@IsString()`, `@IsNotEmpty()`
  - `type`: `@IsEnum(CardType)`, `@IsOptional()` (defaults to `debit`)
  - `cardNumber`: `@IsString()`, `@IsNotEmpty()`
  - `lastFourDigits`: `@IsString()`, `@IsOptional()`
  - `expiryDate`: `@IsString()`, `@IsNotEmpty()`, `@Matches(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/)`
  - `cvv`: `@IsString()`, `@IsOptional()`
- **Success Status Code:** `201 Created`
- **Business Rules:**
  - Strips spaces and slices the last 4 digits (`cleanNumber.slice(-4)`). Full PAN and CVV are never persisted.
  - Initial status is set to `ACTIVE`.
  - Cardholder name is capitalized and trimmed.

#### 10. POST `/api/v1/cards/:id/freeze`
- **Method:** `POST`
- **Route:** `/api/v1/cards/:id/freeze`
- **Auth:** Bearer JWT required
- **Path Param:** `id` (UUID)
- **Success Status Code:** `200 OK`
- **Business Rules:**
  - Verifies ownership (`userId`). Throws `404` if not found.
  - Rejects if `status === DEACTIVATED` (`400 'Deactivated card cannot be modified'`).
  - Rejects if `status === FROZEN` (`400 'Card is already frozen'`).
  - Sets `status = FROZEN`.

#### 11. POST `/api/v1/cards/:id/unfreeze`
- **Method:** `POST`
- **Route:** `/api/v1/cards/:id/unfreeze`
- **Auth:** Bearer JWT required
- **Path Param:** `id` (UUID)
- **Success Status Code:** `200 OK`
- **Business Rules:**
  - Verifies ownership. Throws `404` if not found.
  - Rejects if `status === DEACTIVATED` (`400`).
  - Rejects if `status === ACTIVE` (`400 'Card is already active'`).
  - Rejects if `status !== FROZEN` (`400 'Only a frozen card can be unfrozen'`).
  - Sets `status = ACTIVE`.

#### 12. POST `/api/v1/cards/:id/deactivate`
- **Method:** `POST`
- **Route:** `/api/v1/cards/:id/deactivate`
- **Auth:** Bearer JWT required
- **Path Param:** `id` (UUID)
- **Success Status Code:** `200 OK`
- **Business Rules:**
  - Rejects if already `DEACTIVATED` (`400 'Card is already deactivated'`).
  - Sets `status = DEACTIVATED`.

#### 13. DELETE `/api/v1/cards/:id`
- **Method:** `DELETE`
- **Route:** `/api/v1/cards/:id`
- **Auth:** Bearer JWT required
- **Path Param:** `id` (UUID)
- **Success Status Code:** `200 OK`
- **Response Structure:** `{ "message": "Card successfully deleted", "id": "card-uuid" }`
- **Side Effects:** Hard deletes the card row from PostgreSQL.

#### 14. GET `/api/v1/beneficiaries`
- **Method:** `GET`
- **Route:** `/api/v1/beneficiaries`
- **Auth:** Bearer JWT required
- **Success Status Code:** `200 OK`
- **Response Structure:** Array of active (non-deleted) `Beneficiary` entities ordered by `name ASC`.

#### 15. POST `/api/v1/beneficiaries`
- **Method:** `POST`
- **Route:** `/api/v1/beneficiaries`
- **Auth:** Bearer JWT required
- **Request Body (Bank Account):**
  ```json
  {
    "name": "Maria Rossi",
    "currency": "EUR",
    "payoutMethod": "bank_account",
    "accountNumber": "IT12A345678901234567890",
    "bankCode": "UNCRITM1"
  }
  ```
- **Request Body (UPI):**
  ```json
  {
    "name": "Rajesh Sharma",
    "currency": "INR",
    "payoutMethod": "upi",
    "upiId": "rajesh@okhdfcbank"
  }
  ```
- **Validation Rules (`CreateBeneficiaryDto`):**
  - `name`: `@IsString()`, `@IsNotEmpty()`
  - `currency`: `@IsEnum(Currency)`
  - `payoutMethod`: `@IsEnum(BeneficiaryPayoutMethod)`, `@IsOptional()`
  - Conditional validation:
    - If `payoutMethod === 'bank_account'`: `accountNumber` and `bankCode` required.
    - If `payoutMethod === 'upi'`: `upiId` required.
- **Success Status Code:** `201 Created`
- **Business Rules:**
  - **Strict Limit:** User cannot have $\ge 3$ active beneficiaries (`MAX_BENEFICIARIES = 3`). Throws `400 Bad Request ('Maximum limit of 3 active beneficiaries reached')`.
  - **UPI Constraint:** UPI payout is strictly permitted only when `currency === 'INR'`. Throws `400 Bad Request ('UPI payout method is only supported for INR currency')` otherwise.
- **Side Effects:** Inserts row into `beneficiaries`.

#### 16. DELETE `/api/v1/beneficiaries/:id`
- **Method:** `DELETE`
- **Route:** `/api/v1/beneficiaries/:id`
- **Auth:** Bearer JWT required
- **Path Param:** `id` (UUID)
- **Success Status Code:** `200 OK`
- **Response Structure:** `{ "message": "Beneficiary successfully deleted", "id": "beneficiary-uuid" }`
- **Side Effects:** Executes TypeORM `softDelete({ id, userId })`, populating `deletedAt`. Excluded from future queries.

#### 17. POST `/api/v1/transfers`
- **Method:** `POST`
- **Route:** `/api/v1/transfers`
- **Auth:** Bearer JWT required
- **Required Header:** `Idempotency-Key` (String / UUID). Missing header throws `400 Bad Request ('Idempotency-Key header is required')`.
- **Request Body:**
  ```json
  {
    "beneficiaryId": "0a0ea84f-81fa-4ccc-9c93-dcf094ca9141",
    "sourceWalletId": "82e5e33a-4ac8-4897-834f-0ae927c78ae1",
    "sendAmount": 100.0,
    "destinationCurrency": "INR"
  }
  ```
- **Validation Rules (`CreateTransferDto`):**
  - `beneficiaryId`: `@IsUUID()`, `@IsNotEmpty()`
  - `sourceWalletId`: `@IsUUID()`, `@IsNotEmpty()`
  - `sendAmount`: `@IsNumber()`, `@Min(0.01)`
  - `destinationCurrency`: `@IsEnum(Currency)`, `@IsNotEmpty()`
- **Success Status Code:** `201 Created`
- **Response Structure (`TransferResult`):**
  ```json
  {
    "id": "tx-uuid",
    "reference": "WP-20260917-A1B2C3D4",
    "status": "PENDING",
    "recipient": "Rajesh Sharma",
    "sendAmount": 100.0,
    "sourceCurrency": "EUR",
    "recipientAmount": 8950.0,
    "destinationCurrency": "INR",
    "fee": 25.0,
    "exchangeRate": 89.5,
    "date": "2026-09-17T11:42:00.000Z",
    "createdAt": "2026-09-17T11:42:00.000Z"
  }
  ```
- **Business Rules & Execution Steps:**
  1. **Redis Idempotency Check:** Checks key `wrightpay:idempotency:transfer:${userId}:${idempotencyKey}` with canonical payload SHA256 hash. If key exists with differing payload hash, returns `409 Conflict`. If key exists with status `COMPLETED`, immediately returns cached response without executing DB transactions. If key exists with status `PROCESSING`, polls for up to 2.5s before throwing `409 Conflict`.
  2. **User Status Check:** Verifies user exists and `accountStatus !== SUSPENDED` and `accountStatus !== CLOSED`. If suspended/closed, throws `403 Forbidden ('Account is suspended or closed')`.
  3. **Beneficiary Ownership & Rules:** Verifies active beneficiary belongs to user. If beneficiary uses `UPI`, destination currency must be `INR`.
  4. **Pessimistic Locking:** Queries source wallet with `lock: { mode: 'pessimistic_write' }` (`SELECT ... FOR UPDATE`).
  5. **Exchange Rate Resolution:** Fetches latest exchange rate via `ExchangeRatesService.getRate(wallet.currency, destinationCurrency)`.
  6. **Balance & Fee Calculation:** Fixed fee is `25.00` (`TRANSFER_FEE = 25.0`). Required deduction = `sendAmount + fee`. If `currentBalance < totalDeduction`, throws `400 Bad Request ('Insufficient wallet balance')`.
  7. **Atomic DB Commit:** Deducts balance from wallet, inserts `Transaction` record with `status: PENDING`, reference format `WP-YYYYMMDD-HEX`, and commits PostgreSQL transaction.
  8. **BullMQ Enqueue:** Only *after* DB commit succeeds, enqueues job on `transfers` queue with `PROCESS_TRANSFER_JOB` ('process-transfer'), payload `{ transactionId }`, `jobId: transfer-${txId}`, 3 attempts, exponential backoff (1s).
  9. **Redis Idempotency Completion:** Updates Redis key to `status: COMPLETED` with response cached for 86,400s (24h).

#### 18. GET `/api/v1/transactions`
- **Method:** `GET`
- **Route:** `/api/v1/transactions`
- **Auth:** Bearer JWT required
- **Query Parameters (`GetTransactionsDto`):**
  - `status`: Optional enum (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `SUSPICIOUS`)
  - `reference`: Optional string (case-insensitive substring match against `reference` or `recipient`)
  - `limit`: Optional integer, default `20`, range `1` to `100`
  - `offset`: Optional integer, default `0`, min `0`
- **Success Status Code:** `200 OK`
- **Response Structure:**
  ```json
  {
    "items": [
      {
        "id": "tx-uuid",
        "userId": "user-uuid",
        "reference": "WP-20260816-001",
        "date": "2026-08-16T10:00:00.000Z",
        "recipient": "Rajesh Sharma",
        "amount": 500.0,
        "currency": "EUR",
        "senderAmount": 500.0,
        "senderCurrency": "EUR",
        "recipientAmount": 45250.0,
        "recipientCurrency": "INR",
        "fee": 25.0,
        "exchangeRate": 90.5,
        "status": "COMPLETED",
        "failureReason": null,
        "createdAt": "2026-08-16T10:00:00.000Z"
      }
    ],
    "total": 4,
    "limit": 20,
    "offset": 0
  }
  ```

#### 19. GET `/api/v1/transactions/:id`
- **Method:** `GET`
- **Route:** `/api/v1/transactions/:id`
- **Auth:** Bearer JWT required
- **Path Param:** `id` (UUID)
- **Success Status Code:** `200 OK`
- **Response Structure:** Returns single `FormattedTransaction` matching user ID and transaction ID. Throws `404 Not Found` if missing.

#### 20. GET `/api/v1/exchange-rates`
- **Method:** `GET`
- **Route:** `/api/v1/exchange-rates`
- **Auth:** None (Public)
- **Success Status Code:** `200 OK`
- **Response Structure:** Array of `ExchangeRate` rows ordered by `from ASC, to ASC`.

#### 21. GET `/api/v1/exchange-rates/quote`
- **Method:** `GET`
- **Route:** `/api/v1/exchange-rates/quote`
- **Auth:** None (Public)
- **Query Parameters (`GetQuoteDto`):**
  - `from`: Enum `Currency` (e.g., `EUR`)
  - `to`: Enum `Currency` (e.g., `INR`)
  - `amount`: Number, minimum `0.01`
- **Success Status Code:** `200 OK`
- **Response Structure:**
  ```json
  {
    "from": "EUR",
    "to": "INR",
    "amount": 100.0,
    "rate": 89.5,
    "convertedAmount": 8950.0
  }
  ```
- **Business Rules:**
  - Returns `rate: 1.0` if `from === to`.
  - Checks direct rate (`from -> to`).
  - Checks inverse rate (`1 / (to -> from)`).
  - Checks triangular conversion through EUR (`(1 / (EUR -> from)) * (EUR -> to)`).
  - Rounds `convertedAmount` to 2 decimal places.

---

## 3. Authentication Architecture

### 3.1 Token Generation & Lifetime
- **Library:** `@nestjs/jwt` (integrated with `Passport`).
- **Secret Key:** `JWT_SECRET` loaded from environment variables via `@nestjs/config`.
- **Expiration:** `JWT_EXPIRES_IN` (defaults to `24h` in module registration, set to `1d` in backend `.env`).
- **Payload Structure:**
  ```json
  {
    "sub": "user-uuid",
    "email": "user@example.com",
    "iat": 1773740000,
    "exp": 1773826400
  }
  ```

### 3.2 Guard & Context Injection
- **Guard:** [JwtAuthGuard](file:///Users/ankitpandey/Desktop/projects/WrightPay/backend/src/core/guards/jwt-auth.guard.ts#L7-L36) implements NestJS `CanActivate`.
- **Extraction:** Extracts token from `Authorization: Bearer <token>` header.
- **Verification:** Calls `jwtService.verifyAsync(token, { secret })`.
- **Request Context:** Injects `request['user'] = { id: payload.sub, email: payload.email }`.
- **Decorator:** `@CurrentUser()` retrieves `request.user` for controller route handlers.
- **Ownership Principle:** Endpoints derive user identity exclusively from the verified token payload. Client-provided user IDs are ignored, preventing IDOR/BOLA by design.

### 3.3 Password Hashing
- Uses `argon2` ([argon2.hash](file:///Users/ankitpandey/Desktop/projects/WrightPay/backend/src/modules/auth/auth.service.ts#L34) and `argon2.verify`).
- `passwordHash` column in `users` entity is marked `@Column({ select: false })` to prevent accidental disclosure during queries.

### 3.4 Email Verification & OTP
- OTPs are stored in `email_verifications` table with a 15-minute expiration timestamp.
- In `development` mode, the verification code defaults to `123456`.
- Successful verification transitions `user.accountStatus` from `PENDING` to `ACTIVE`.

### 3.5 Authentication Findings & Edge Cases
1. **Unverified Account Login:** `AuthService.login()` validates passwords and rejects `SUSPENDED` or `CLOSED` users, but does *not* throw an exception if `user.accountStatus === PENDING`. Unverified users receive a valid JWT token.
2. **Stateless Logout:** `AuthService.logout()` does not store invalidated tokens in a Redis blacklist. The client simply clears `localStorage.getItem('wrightpay_access_token')`.
3. **No Refresh Token Flow:** There is currently no refresh token rotation mechanism (`/auth/refresh`). Sessions expire when the access token expires.

---

## 4. Database Architecture

### 4.1 Engine & Configuration
- **Engine:** PostgreSQL 15.
- **ORM:** TypeORM v1.1.0 with `@nestjs/typeorm`.
- **Connection:** Configured asynchronously via `DATABASE_URL` with auto-detected SSL (`sslmode=require` or `ssl=true`).
- **Synchronize Setting:** `synchronize: true` in `app.module.ts`.

### 4.2 Migration & Seeding Status
- **Migrations:** **NOT IMPLEMENTED**. There are no TypeORM migration files or migration generation scripts in `backend/package.json`. The schema is auto-generated by TypeORM entity synchronization.
- **Seeding Script:** Implemented at [backend/src/database/seed/seed.ts](file:///Users/ankitpandey/Desktop/projects/WrightPay/backend/src/database/seed/seed.ts#L46). Executable via `npm run seed` in `backend`.
  - Performs `TRUNCATE TABLE transactions, cards, beneficiaries, exchange_rates, wallets, email_verifications, users CASCADE`.
  - Seeds 3 users, 3 wallets, 5 exchange rates, 1 beneficiary, 1 card, and 5 historical transactions.

### 4.3 PostgreSQL Schema & Entity Relationships

```mermaid
erDiagram
    users ||--o{ wallets : "owns"
    users ||--o{ cards : "owns"
    users ||--o{ beneficiaries : "owns"
    users ||--o{ transactions : "initiates"
    users ||--o{ email_verifications : "target_email"

    users {
        uuid id PK
        varchar name
        varchar email UK
        varchar passwordHash
        enum accountType
        varchar countryOfResidence
        enum kycStatus
        enum accountStatus
        enum defaultCurrency
        timestamp createdAt
        timestamp updatedAt
    }

    wallets {
        uuid id PK
        uuid userId FK
        enum currency
        decimal balance "precision 12, scale 2"
        boolean isDefault
    }

    cards {
        uuid id PK
        uuid userId FK
        varchar lastFourDigits
        varchar cardholderName
        varchar expiryDate
        enum status
        enum type
        timestamp createdAt
        timestamp updatedAt
    }

    beneficiaries {
        uuid id PK
        uuid userId FK
        varchar name
        enum currency
        enum payoutMethod
        varchar accountNumber
        varchar bankCode
        varchar ifscCode
        varchar upiId
        varchar bankName
        timestamp deletedAt "Soft delete"
    }

    transactions {
        uuid id PK
        uuid userId FK
        varchar reference UK
        timestamp date
        varchar recipient
        decimal amount "precision 12, scale 2"
        enum currency
        decimal senderAmount
        enum senderCurrency
        decimal recipientAmount
        enum recipientCurrency
        decimal fee
        decimal exchangeRate "precision 10, scale 4"
        enum status
        varchar failureReason
        timestamp createdAt
    }

    exchange_rates {
        uuid id PK
        enum from
        enum to
        decimal rate "precision 10, scale 6"
        timestamp timestamp
        timestamp createdAt
    }

    email_verifications {
        uuid id PK
        varchar email
        varchar verificationCode
        boolean isVerified
        timestamp createdAt
        timestamp expiresAt
    }
```

### 4.4 Financial Concurrency Controls
- Wallet deductions in [transfers.service.ts](file:///Users/ankitpandey/Desktop/projects/WrightPay/backend/src/modules/transfers/transfers.service.ts#L120-L123) use **pessimistic write locking** (`SELECT ... FOR UPDATE`):
  ```typescript
  const wallet = await queryRunner.manager.findOne(Wallet, {
    where: { id: sourceWalletId, userId },
    lock: { mode: 'pessimistic_write' },
  });
  ```
- Balance check and debit are wrapped in a single database transaction (`queryRunner.startTransaction() ... commitTransaction() / rollbackTransaction()`).

---

## 5. Redis / BullMQ Architecture

### 5.1 Redis Configuration
- **Engine:** Redis 7 (Docker port `6379`).
- **Connection:** Managed by [RedisService](file:///Users/ankitpandey/Desktop/projects/WrightPay/backend/src/core/redis/redis.service.ts#L6-L62) using `ioredis`. Supports `REDIS_URL` or fallback to `REDIS_HOST` / `REDIS_PORT`. Supports TLS (`rediss://`).
- **Role in Application:**
  1. Transfer idempotency records and concurrency locking.
  2. Message broker for BullMQ job queues.

### 5.2 BullMQ Queue & Worker Architecture
- **Queue Name:** `transfers` (`TRANSFERS_QUEUE` constant).
- **Job Name:** `process-transfer` (`PROCESS_TRANSFER_JOB` constant).
- **Job ID Pattern:** `transfer-${transaction.id}` (prevents duplicate job enqueueing in BullMQ).
- **Enqueue Timing:** Enqueued in [transfers.service.ts](file:///Users/ankitpandey/Desktop/projects/WrightPay/backend/src/modules/transfers/transfers.service.ts#L186-L202) strictly **after** PostgreSQL transaction commit succeeds.
- **Job Retry Policy:** `attempts: 3`, `backoff: { type: 'exponential', delay: 1000 }`.
- **Worker Host:** [TransfersProcessor](file:///Users/ankitpandey/Desktop/projects/WrightPay/backend/src/modules/transfers/processors/transfers.processor.ts#L14-L148) annotated with `@Processor('transfers')`.

### 5.3 Asynchronous Settlement Lifecycle
1. **Initial State:** Transfer API creates transaction in PostgreSQL with `status: PENDING`.
2. **Transition to PROCESSING:** Worker attempts conditional atomic update (`UPDATE transactions SET status = 'PROCESSING' WHERE id = :id AND status = 'PENDING'`).
3. **Execution & External Settlement:** Worker calls `processTransfer(transaction)`.
   - Simulates gateway settlement delay: `50ms`.
   - **Simulated Failure Hook:** If `transaction.recipient` contains `'SIMULATE_FAILURE'`, the worker throws an error.
4. **Transition to COMPLETED:** On success, worker updates `transactions SET status = 'COMPLETED'`.
5. **Transition to FAILED:** If attempts are exhausted ($3$ attempts) or failure is marked non-retryable, worker updates `status = 'FAILED'` and records `failureReason`.

### 5.4 Idempotency Implementation
- Implemented in [IdempotencyService](file:///Users/ankitpandey/Desktop/projects/WrightPay/backend/src/modules/transfers/services/idempotency.service.ts#L20-L157).
- **Key Format:** `wrightpay:idempotency:transfer:${userId}:${idempotencyKey.trim()}`
- **Payload Hash:** SHA256 of `{ sourceWalletId, beneficiaryId, sendAmount: Number(dto.sendAmount), destinationCurrency }`.
- **Two-Phase Commit in Redis:**
  1. `SET key initialRecord EX 60 NX`: Acquires processing lock for 60 seconds.
  2. If locked, executes transfer and writes `completedRecord` with `status: 'COMPLETED'` and TTL of 86,400 seconds (24 hours).
  3. If transfer execution throws, deletes the key from Redis to allow clean client retries.
  4. If key already exists:
     - Conflicting payload hash $\to$ throws `409 ConflictException`.
     - Matching hash & `COMPLETED` $\to$ immediately returns cached response (`Idempotent replay`).
     - Matching hash & `PROCESSING` $\to$ polls Redis for up to 2.5 seconds (25 attempts $\times$ 100ms) waiting for completion before raising a 409 conflict.

---

## 6. Existing Test Infrastructure

### 6.1 Playwright Test Automation Skeleton (`qa/automation`)
- **Configuration:** [qa/automation/playwright.config.ts](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/automation/playwright.config.ts#L1-L53)
  - `testDir`: `./tests`
  - `baseURL`: `http://localhost:3000` (from `config.baseUrl`)
  - `reporters`: List, HTML (`reports/html-report`), JSON (`reports/test-results.json`)
  - `outputDir`: `./reports/test-artifacts`
  - Browser: Chromium (`Desktop Chrome`)
- **Package Configuration:** [qa/automation/package.json](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/automation/package.json#L1-L18)
  - Installed dependencies: `@playwright/test` (^1.50.1), `dotenv` (^16.4.7), `typescript` (^5.7.3), `@types/node` (^22.13.4).
  - Missing dependencies for full test framework: `pg` (PostgreSQL client), `ioredis` (Redis client), `bullmq` (Queue inspection).
- **Environment Loader:** [qa/automation/config/env.config.ts](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/automation/config/env.config.ts#L1-L34)
  - **CRITICAL MISMATCH:** `apiBaseUrl` defaults to `'http://localhost:4000/api'`. Actual backend runs on `http://localhost:3001/api/v1`.
- **Existing Tests:**
  - [tests/proof-of-life.spec.ts](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/automation/tests/proof-of-life.spec.ts#L1-L12): 1 passing test verifying test runner execution.
  - All other test folders contain only `.gitkeep` files.

### 6.2 Backend Unit & E2E Testing (`backend`)
- **Jest Unit Tests:** [backend/jest.config.js](file:///Users/ankitpandey/Desktop/projects/WrightPay/backend/jest.config.js#L1-L12)
  - 16 test suites total.
  - **Audit Test Run Result:** 8 service unit test suites pass (76 tests passing: `transfers.service.spec.ts`, `transfers.processor.spec.ts`, `idempotency.service.spec.ts`, `wallets.service.spec.ts`, etc.).
  - **Audit Failure Finding:** 8 controller unit test suites fail due to unmocked `JwtAuthGuard` dependencies (`JwtService`, `ConfigService`) in default NestJS generated specs (`users.controller.spec.ts`, `auth.controller.spec.ts`, `beneficiaries.controller.spec.ts`, etc.).
- **Backend E2E Tests:** `backend/test/jest-e2e.json` is configured, but the directory contains **0** `.e2e-spec.ts` test files.

### 6.3 Frontend Testing (`frontend`)
- **Status:** **NOT IMPLEMENTED**.
- `frontend/package.json` has no test dependencies (no Jest, Vitest, React Testing Library, Cypress, or Playwright).

---

## 7. Environment Configuration

### 7.1 Port & URL Mapping Matrix

| Component | Local Port | Environment Variable | Default Value | Notes |
|---|---|---|---|---|
| **Frontend UI** | `3000` | `PORT` | `3000` | Next.js development server |
| **Backend API** | `3001` | `PORT` | `3001` | NestJS REST API server |
| **Global Prefix**| - | - | `/api/v1` | Configured in `backend/src/main.ts` |
| **Swagger UI** | `3001` | - | `http://localhost:3001/api/docs` | Global prefix disabled for docs |
| **PostgreSQL** | `5432` | `DATABASE_URL` | `postgres://postgres:password@localhost:5432/wrightpay` | Docker Compose `postgres:15` |
| **Redis** | `6379` | `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT` | `localhost:6379` | Docker Compose `redis:7` |
| **Frontend API Target** | - | `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | In `frontend/.env.local` |
| **QA Automation Target**| - | `BASE_URL`, `API_BASE_URL` | `http://localhost:3000`, `http://localhost:4000/api` | **Mismatch:** Port 4000 vs 3001 |

### 7.2 Service Startup Procedures

1. **Database & Cache Infrastructure:**
   ```bash
   cd backend && docker-compose up -d
   ```
2. **Database Seeding:**
   ```bash
   cd backend && npm run seed
   ```
3. **Backend Service:**
   ```bash
   cd backend && npm run start:dev
   ```
4. **Frontend Service:**
   ```bash
   cd frontend && npm run dev
   ```
5. **QA Test Execution:**
   ```bash
   cd qa/automation && npm test
   ```

---

## 8. GitHub Actions Readiness

- **Current Readiness Level:** **0% / NOT IMPLEMENTED**
- **Findings:**
  - No `.github` directory or `.github/workflows` YAML files exist in the repository.
  - No CI test execution pipeline currently runs on pull requests or commits.
- **Required Workflow Setup for CI Readiness:**
  1. **Container Services:** GitHub Actions runner must provision `postgres:15` and `redis:7` service containers.
  2. **Dependencies & Build:** Install dependencies for `backend`, `frontend`, and `qa/automation`.
  3. **Database Initialization:** Run database migrations or `npm run seed` to bootstrap tables and test accounts.
  4. **Background Service Launch:** Start backend server (`PORT=3001`) and frontend server (`PORT=3000`), waiting on health checks.
  5. **Playwright Execution:** Install browser binaries via `npx playwright install --with-deps chromium` and execute test suite.
  6. **Artifact Archiving:** Upload `reports/html-report`, `reports/test-results.json`, and trace files on failure.

---

## 9. Gaps Between Current Application and Testing Strategy

Comparing the current codebase against the specifications in `qa/WrightPay_Master_Test_Strategy.md`:

| Domain / Area | Testing Strategy Expectation | Actual Codebase Implementation | Status & Gap Assessment |
|---|---|---|---|
| **Onboarding / KYC** | Verify document upload, KYC status transitions (`NOT_STARTED` $\to$ `PENDING` $\to$ `APPROVED`/`REJECTED`), and AML checks | Backend has `KycStatus` enum on `User` entity, but **zero** KYC endpoints exist. Frontend `/onboarding` is a 100% client-side mock wizard that redirects to dashboard. | **NOT IMPLEMENTED** (Backend KYC API missing) |
| **Multi-Currency Wallets** | Create and manage distinct multi-currency wallets per user | Backend permits only 1 primary wallet per user created during signup. `GET /wallets/me` dynamically calculates equivalent balances in 6 currencies. No `POST /wallets` exists. | **NOT IMPLEMENTED** (Multiple distinct wallet entities per user not supported) |
| **Banking / Payout Gateway** | External banking integration or settlement provider | No third-party banking integration. Implemented internally in `TransfersProcessor` with a simulated 50ms timer and a `SIMULATE_FAILURE` string hook. | **INTERNAL SIMULATION ONLY** |
| **Server-Side Token Revocation** | Invalidate token on logout via Redis blacklist | `POST /auth/logout` returns success message; no token blacklisting in Redis. | **NOT IMPLEMENTED** (Client-side token discard only) |
| **Password Reset / MFA** | Password reset via email and multi-factor authentication | No password reset or MFA endpoints exist in `AuthModule`. | **NOT IMPLEMENTED** |
| **Automation Environment Config** | Automation config points to live API endpoints | `qa/automation/config/env.config.ts` has default `http://localhost:4000/api` instead of `http://localhost:3001/api/v1`. | **REQUIRES CORRECTION** |
| **Database Migrations** | Managed migrations for production database evolution | TypeORM uses `synchronize: true`. No migration scripts or files exist. | **NOT IMPLEMENTED** |
| **Beneficiary Max Count** | Enforce beneficiary limits | Strictly enforced: `MAX_BENEFICIARIES = 3`. | **FULLY IMPLEMENTED** |
| **UPI Payment Constraint** | UPI transfers restricted to INR currency | Strictly enforced on both Beneficiary creation and Transfer initiation. | **FULLY IMPLEMENTED** |
| **Transfer Concurrency Safety** | Prevent lost updates and race conditions during simultaneous transfers | Enforced via pessimistic write locking (`pessimistic_write` / `SELECT ... FOR UPDATE`) in TypeORM transaction. | **FULLY IMPLEMENTED** |
| **Transfer Idempotency** | Prevent duplicate debits on repeated network requests | Enforced via `IdempotencyService` in Redis with SHA256 payload verification and 24h caching. | **FULLY IMPLEMENTED** |
| **Async Transfer Queue** | Asynchronous transfer settlement via message queue | Enforced via BullMQ `transfers` queue and `TransfersProcessor`. | **FULLY IMPLEMENTED** |
| **Backend Unit Tests** | All backend unit tests pass in CI | 8 service specs pass; 8 controller specs fail due to missing NestJS guard provider mocks. | **REQUIRES FIX IN TEST SPECS** |
| **GitHub Actions Pipeline** | Continuous testing on push and pull requests | No workflow files in repository. | **NOT IMPLEMENTED** |

---

## 10. Recommended Implementation Order

To turn the WrightPay testing strategy into a robust, working automation framework without breaking existing systems, the implementation must proceed in the following order:

```mermaid
graph TD
    A[Step 1: Fix QA Automation Config & Dependencies] --> B[Step 2: Database & Redis Test Helpers]
    B --> C[Step 3: API Test Clients & Auth Fixtures]
    C --> D[Step 4: Comprehensive API Test Suite]
    D --> E[Step 5: High-Risk Financial & Concurrency Integration Suite]
    E --> F[Step 6: Frontend Page Objects & E2E Critical Journeys]
    F --> G[Step 7: Local Orchestration & GitHub Actions CI Workflow]
```

### Phase Breakdown

1. **Step 1: Automation Configuration & Dependency Alignment**
   - Correct default `API_BASE_URL` in `qa/automation/config/env.config.ts` from `4000/api` to `http://localhost:3001/api/v1`.
   - Install required SDET dependencies in `qa/automation/package.json`: `pg` + `@types/pg` (PostgreSQL direct assertions), `ioredis` + `@types/ioredis` (Redis cache/lock assertions), and `bullmq` (Queue job inspection).

2. **Step 2: Database & Redis Test Infrastructure Helpers**
   - Implement database connection pool helper in `qa/automation/database/` to query PostgreSQL directly for verifying balance states, transaction records, and seed resets.
   - Implement Redis helper in `qa/automation/redis/` to inspect idempotency keys, locks, and TTLs.
   - Implement BullMQ helper in `qa/automation/queues/` to inspect job statuses (`completed`, `failed`, `waiting`).

3. **Step 3: Centralized API Client & Authentication Fixtures**
   - Implement reusable API client wrappers in `qa/automation/api/` for all backend domains.
   - Implement Playwright test fixtures in `qa/automation/fixtures/` providing pre-authenticated sessions (`annaUser`, `tariqUser`, `acmeUser`) and auto-generated fresh test accounts.

4. **Step 4: Domain API Automation Test Suites**
   - **Auth API:** Signup, validation, duplicate email rejection, login success/failure, OTP verification, suspended/closed accounts.
   - **Wallets API:** `GET /wallets/me`, balance accuracy, exchange rate equivalents.
   - **Cards API:** Tokenization, freeze, unfreeze, deactivate, delete, PAN/CVV privacy verification.
   - **Beneficiaries API:** Max limit enforcement ($3$), UPI-INR constraint, soft delete.
   - **Exchange Rates API:** All rates, direct quote, inverse quote, triangular EUR quote.
   - **Transactions API:** Historical ledger retrieval, status filtering, reference search, pagination.

5. **Step 5: High-Risk Financial, Idempotency & Concurrency Suite**
   - **Idempotency Tests:** Identical requests with same key return identical responses without duplicate deductions; conflicting payloads return `409 Conflict`.
   - **Transfer Financial Integrity:** Balance deduction = `amount + 25.00 fee`; transaction record generated with accurate exchange rate.
   - **Concurrency / Race Condition Tests:** Send 5 concurrent transfers against a wallet with balance sufficient for only 1 or 2; verify zero negative balance and exact debit counts.
   - **BullMQ Settlement Lifecycle:** Verify transition from `PENDING` $\to$ `PROCESSING` $\to$ `COMPLETED`; verify `SIMULATE_FAILURE` transitions to `FAILED`.

6. **Step 6: Frontend Page Object Models & E2E Critical Journeys**
   - Implement POMs: `LoginPage`, `SignupPage`, `VerifyEmailPage`, `DashboardPage`, `SendMoneyPage`, `BeneficiariesPage`, `CardsPage`.
   - E2E Tests:
     - User registration $\to$ email verification $\to$ login $\to$ dashboard view.
     - Send money wizard: select beneficiary $\to$ enter amount $\to$ verify quote/fee $\to$ submit transfer $\to$ poll BullMQ completion $\to$ verify updated dashboard balance and transaction list.

7. **Step 7: GitHub Actions CI & Local Runner Orchestration**
   - Create `.github/workflows/e2e-tests.yml` with Postgres and Redis service containers.
   - Add local test orchestration script (e.g. `npm run test:local` that validates service health before firing test suites).

---

## 11. Exact Files Next Implementation Step Should Create or Modify

For the **next implementation step** (Framework Scaffolding & Configuration Alignment):

### Files to Modify
1. [qa/automation/config/env.config.ts](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/automation/config/env.config.ts)
   - Update `apiBaseUrl` fallback to `http://localhost:3001/api/v1`.
   - Add database and Redis connection configuration settings.
2. [qa/automation/package.json](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/automation/package.json)
   - Add `pg`, `@types/pg`, `ioredis`, `@types/ioredis`, and `bullmq` as devDependencies.
3. [qa/automation/.env.example](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/automation/.env.example)
   - Update backend URL to port 3001 and uncomment local DB/Redis connection parameters.

### Files to Create
1. `qa/automation/database/db-client.ts`
   - Direct PostgreSQL client utility for pre-test data seeding, cleanup, and state assertions.
2. `qa/automation/redis/redis-client.ts`
   - Direct Redis client utility for validating idempotency keys and cache entries.
3. `qa/automation/queues/queue-client.ts`
   - Direct BullMQ queue reader utility for verifying transfer job states and failure reasons.
4. `qa/automation/fixtures/auth.fixture.ts`
   - Playwright custom fixture for creating authenticated API request contexts and browser sessions.
5. `qa/automation/api/base-api.client.ts`
   - Standardized HTTP client with automatic auth injection and response typing.

# WrightPay — Phase 4B Render Infrastructure Deployment Checklist

**Document Version:** 1.0.0  
**Date:** 2026-08-21  
**Target Repository:** `ankitatpy/WrightPay`  
**Git Checkpoint Commit:** `defad0a561935de5494319de1d74753c37273dab`  
**Git Branch:** `main-10098224823991460291`

---

## 1. Executive Summary & Architecture Overview

WrightPay Backend is architected to run on **Render** as a unified Node.js application:
- **NestJS REST API**: Serves all `/api/v1/*` endpoints.
- **BullMQ Worker (`TransfersProcessor`)**: Embedded in-process worker that consumes transfer jobs from the Redis `transfers` queue.
- **Infrastructure Services**:
  - **1x Render Web Service** (API + Worker combined).
  - **1x Render PostgreSQL** (Relational ledger and persistence).
  - **1x Render Redis** (Idempotency storage + BullMQ queue backing).

---

## 2. Render Infrastructure Specifications

### A. PostgreSQL Database (`wrightpay-db`)
- **Service Type:** PostgreSQL
- **Name:** `wrightpay-db`
- **Database Name:** `wrightpay`
- **User:** `wrightpay_user` (or Render default)
- **Region:** Choose closest region (e.g. Frankfurt / Ohio / Oregon)
- **Plan:** Free / Starter
- **Outputs needed for Web Service:**
  - **Internal Database URL** (Use this for `DATABASE_URL` in the Web Service to keep traffic on Render's private network).

### B. Redis Instance (`wrightpay-redis`)
- **Service Type:** Redis
- **Name:** `wrightpay-redis`
- **Region:** Same region as PostgreSQL & Web Service
- **Plan:** Free / Starter
- **Maxmemory Policy:** `noeviction` (Recommended for BullMQ queues so pending jobs are never evicted)
- **Outputs needed for Web Service:**
  - **Internal Redis URL** (Use this for `REDIS_URL` in the Web Service).

### C. Backend Web Service (`wrightpay-api`)
- **Service Type:** Web Service
- **Name:** `wrightpay-api`
- **Repository:** `https://github.com/ankitatpy/WrightPay`
- **Branch:** `main-10098224823991460291`
- **Root Directory:** `backend`
- **Runtime:** `Node`
- **Node Version:** Node 20+ (Render default LTS)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start:prod`
- **Health Check Path:** `/api/v1`
- **Auto-Deploy:** Yes (on push to branch)

---

## 3. Environment Variable Matrix (Render Web Service)

Enter the following environment variables in the Render Web Service settings (**Environment** tab):

| Variable Name | Required | Example / Recommended Value | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables production optimizations in NestJS and TypeORM. |
| `PORT` | Auto | `10000` *(Render sets this automatically)* | Port on which the HTTP server listens. |
| `DATABASE_URL` | **Yes** | `postgres://...` *(From Render PostgreSQL)* | Internal connection string to cloud PostgreSQL. |
| `DATABASE_SSL` | Optional | `false` *(Internal Render network)* or `true` | Explicit SSL flag. Automatically active if URL has `sslmode=require`. |
| `REDIS_URL` | **Yes** | `redis://...` *(From Render Redis)* | Internal connection string for idempotency keys and BullMQ queues. |
| `JWT_SECRET` | **Yes** | `[Generate 64+ char random string]` | Cryptographic secret for signing and verifying JWT tokens. |
| `JWT_EXPIRES_IN` | Optional | `1d` | Token validity duration. |
| `FRONTEND_URL` | **Yes** | `https://<your-vercel-app>.vercel.app` | Primary frontend domain for CORS whitelist. |
| `IDEMPOTENCY_TTL_SECONDS` | Optional | `86400` | Expiration TTL (24h) for transfer idempotency keys. |

> [!IMPORTANT]
> **Secret Generation Tip:** Generate a strong `JWT_SECRET` using terminal:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 4. Database Schema & Baseline Seeding Strategy

### Step A: Automatic Schema Creation
On initial boot of `wrightpay-api`, TypeORM's `synchronize: true` will connect to the clean PostgreSQL database and automatically create all tables:
- `users`
- `wallets`
- `exchange_rates`
- `beneficiaries`
- `cards`
- `transactions`
- `email_verifications`

### Step B: Non-Destructive Baseline Exchange Rate Seeding
To allow currency conversion quotes and transfers to operate, the `exchange_rates` table must contain the baseline exchange rates for `EUR`, `USD`, `GBP`, `AED`, `PLN`, `INR`.

Run the following safe, idempotent SQL insert in Render's PostgreSQL query console (or via `psql`):

```sql
INSERT INTO exchange_rates (id, "fromCurrency", "toCurrency", rate, "updatedAt")
VALUES
  (gen_random_uuid(), 'EUR', 'USD', 1.085000, NOW()),
  (gen_random_uuid(), 'USD', 'EUR', 0.921659, NOW()),
  (gen_random_uuid(), 'EUR', 'GBP', 0.855000, NOW()),
  (gen_random_uuid(), 'GBP', 'EUR', 1.169591, NOW()),
  (gen_random_uuid(), 'EUR', 'AED', 3.985000, NOW()),
  (gen_random_uuid(), 'AED', 'EUR', 0.250941, NOW()),
  (gen_random_uuid(), 'EUR', 'PLN', 4.325000, NOW()),
  (gen_random_uuid(), 'PLN', 'EUR', 0.231214, NOW()),
  (gen_random_uuid(), 'EUR', 'INR', 90.500000, NOW()),
  (gen_random_uuid(), 'INR', 'EUR', 0.011050, NOW()),
  (gen_random_uuid(), 'USD', 'GBP', 0.788018, NOW()),
  (gen_random_uuid(), 'GBP', 'USD', 1.269006, NOW()),
  (gen_random_uuid(), 'USD', 'AED', 3.672800, NOW()),
  (gen_random_uuid(), 'AED', 'USD', 0.272272, NOW()),
  (gen_random_uuid(), 'USD', 'INR', 83.410138, NOW()),
  (gen_random_uuid(), 'INR', 'USD', 0.011989, NOW()),
  (gen_random_uuid(), 'GBP', 'INR', 105.847953, NOW()),
  (gen_random_uuid(), 'INR', 'GBP', 0.009448, NOW()),
  (gen_random_uuid(), 'EUR', 'EUR', 1.000000, NOW()),
  (gen_random_uuid(), 'USD', 'USD', 1.000000, NOW()),
  (gen_random_uuid(), 'GBP', 'GBP', 1.000000, NOW()),
  (gen_random_uuid(), 'AED', 'AED', 1.000000, NOW()),
  (gen_random_uuid(), 'PLN', 'PLN', 1.000000, NOW()),
  (gen_random_uuid(), 'INR', 'INR', 1.000000, NOW())
ON CONFLICT DO NOTHING;
```

---

## 5. Step-by-Step Deployment Execution Order

```text
[Step 1: PostgreSQL]
   Create Render PostgreSQL database ("wrightpay-db").
   Copy the Internal Database URL.
         │
         ▼
[Step 2: Redis]
   Create Render Redis instance ("wrightpay-redis").
   Copy the Internal Redis URL.
         │
         ▼
[Step 3: Web Service]
   Create Render Web Service ("wrightpay-api") pointing to GitHub repo & branch.
   Set Root Directory to "backend".
   Set Build Command: "npm install && npm run build".
   Set Start Command: "npm run start:prod".
   Set Health Check Path: "/api/v1".
         │
         ▼
[Step 4: Environment Variables]
   Add DATABASE_URL, REDIS_URL, JWT_SECRET, FRONTEND_URL, NODE_ENV to Render.
         │
         ▼
[Step 5: Initial Deploy]
   Trigger initial deployment on Render and wait for "Live" status.
         │
         ▼
[Step 6: Database Seeding]
   Execute baseline Exchange Rates SQL script in PostgreSQL.
         │
         ▼
[Step 7: Backend Health Verification]
   Verify:
   1. https://<app>.onrender.com/api/v1 returns "Hello World!" (HTTP 200).
   2. https://<app>.onrender.com/api/v1/exchange-rates returns exchange rate array.
   3. https://<app>.onrender.com/api/docs opens Swagger API UI.
         │
         ▼
[Step 8: Vercel Frontend Configuration]
   Set NEXT_PUBLIC_API_URL = "https://<app>.onrender.com/api/v1" on Vercel.
   Trigger Vercel build/deployment.
         │
         ▼
[Step 9: Full E2E Production Smoke Test]
   Perform real user signup, wallet load, rate quote, and live transfer in production browser.
```

---

## 6. Post-Deployment Verification Checklist

- [ ] **Render Health Check:** Web service status is `Live` with green health check on `/api/v1`.
- [ ] **Swagger Documentation:** Navigating to `https://<app>.onrender.com/api/docs` loads the OpenAPI interactive documentation.
- [ ] **Exchange Rate API:** `GET https://<app>.onrender.com/api/v1/exchange-rates` returns JSON array with valid rates.
- [ ] **Exchange Rate Quote:** `GET https://<app>.onrender.com/api/v1/exchange-rates/quote?from=EUR&to=USD&amount=100` returns `{ sourceAmount: 100, convertedAmount: 108.5, rate: 1.085 }`.
- [ ] **User Registration:** `POST /api/v1/auth/signup` creates account and default EUR wallet with 0 balance.
- [ ] **Email Verification:** `POST /api/v1/auth/verify-email` verifies account with code `123456` (or generated OTP).
- [ ] **User Authentication:** `POST /api/v1/auth/login` returns valid JWT `access_token`.
- [ ] **BullMQ Processing:** Initiating transfer processes from `PENDING` → `PROCESSING` → `COMPLETED` via the in-process worker.
- [ ] **Idempotency Replay:** Replaying the identical transfer with the same `Idempotency-Key` returns the cached completed transaction record without deducting balance twice.

---

## 7. Rollback & Disaster Recovery Plan

- **Render Service Rollback:**
  - In the Render dashboard under **Deploys**, select any previous successful deployment and click **Rollback to this deploy**.
- **Database Backup & Recovery:**
  - Render PostgreSQL automatically takes daily backups. A manual point-in-time snapshot can be triggered before major upgrades.
- **Queue Drain & Flush (If needed):**
  - If a corrupted job gets trapped in the queue, Redis command `DEL bull:transfers:*` will reset the queue without affecting database records.

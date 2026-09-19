# WrightPay — Phase 4 Production Deployment Plan

**Document Version:** 1.0.0  
**Date:** 2026-08-21  
**Target Environments:**
- **Frontend:** Vercel (Next.js 16.3.1 App Router)
- **Backend:** Render (NestJS 11 + BullMQ in-process worker)
- **Database:** Render PostgreSQL 16 (or Supabase / AWS RDS)
- **Cache & Queue:** Render Redis / Upstash Redis (Redis 7+)

---

## 1. Current Architecture vs Target Production Architecture

### Current Local Architecture
```text
[ Browser ]
    │
    ▼ (http://localhost:3000)
[ Next.js Frontend ]
    │
    ▼ (http://localhost:3001/api/v1)
[ NestJS API + BullMQ Worker (PID 9749) ]
    ├── PostgreSQL 16 (localhost:5432/wrightpay)
    └── Redis 7.2 (localhost:6379)
```

### Target Production Architecture
```text
[ End User / Web Browser ]
    │
    ▼ HTTPS
[ Vercel Edge / CDN ]
  └── Next.js 16 App Router Frontend (e.g., https://wrightpay.vercel.app)
        │
        ▼ HTTPS (NEXT_PUBLIC_API_URL)
[ Render Web Service ]
  └── NestJS 11 API Backend + In-Process BullMQ Worker
        ├── TLS / SSL Connection ──► [ Cloud PostgreSQL 16 ] (Render / Supabase)
        └── TLS / REDIS_URL ───────► [ Cloud Redis 7.2 ] (Render Redis / Upstash)
```

---

## 2. Backend Deployment Requirements (Render)

### Service Specification
- **Service Type:** Web Service
- **Runtime:** Node (Node.js 20+ / 22 LTS recommended)
- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start:prod` (`node dist/main`)
- **Health Check Path:** `/api/v1/exchange-rates` or Swagger docs `/api/docs`

### Process Model
- The NestJS application runs both the HTTP API server (`AppModule`) and the BullMQ Queue Processor (`TransfersProcessor`) within the **same Node.js process**.
- No separate background worker service is required on Render, minimizing operational complexity and infrastructure cost.

---

## 3. Database Requirements (PostgreSQL)

- **PostgreSQL Version:** 15.x or 16.x
- **Schema Management:**
  - `AppModule` currently configures `synchronize: true` in TypeORM.
  - On a fresh production database, initial startup will automatically create all tables (`users`, `wallets`, `exchange_rates`, `beneficiaries`, `cards`, `transactions`, `email_verifications`).
  - For long-term production maintenance, schema migrations (`typeorm migration:generate`) should replace runtime synchronization.
- **SSL Requirements:**
  - Cloud PostgreSQL providers (Render, Supabase, Neon) enforce SSL connections.
  - The connection URL must include SSL parameters (`?sslmode=require` or `ssl: { rejectUnauthorized: false }`).
- **Initial Data Seeding:**
  - The existing `seed.ts` script executes `TRUNCATE TABLE ... CASCADE` and inserts demo users and exchange rates.
  - **Do NOT run `npm run seed` on an active database** with real users.
  - A dedicated production seed script should be created to populate only the baseline `exchange_rates` (EUR, USD, GBP, AED, PLN, INR) without truncating or inserting mock demo accounts.

---

## 4. Redis & BullMQ Architecture

- **Redis Version:** Redis 7.0+
- **Connection Format:** Supports standard `REDIS_URL` (e.g. `rediss://default:<password>@<host>:<port>`).
- **Queue Name:** `transfers`
- **Job Name:** `process-transfer`
- **Resilience & State Persistence:**
  - Redis persists enqueued BullMQ jobs.
  - Idempotency keys (`idempotency:transfer:<key>`) have a 24-hour TTL in Redis.
  - If Redis is unreachable during `POST /transfers`, the API fails closed (rejects the transfer before deducting wallet balances).
  - If the Render Web Service restarts while a job is in progress, the idempotent `TransfersProcessor` safely resumes and skips already completed records.

---

## 5. Frontend Requirements (Vercel)

- **Deployment Platform:** Vercel
- **Framework Preset:** Next.js
- **Root Directory:** `frontend`
- **Build Command:** `npm run build` (`next build --webpack`)
- **Output Directory:** `.next` (default)
- **Environment Variable:**
  - `NEXT_PUBLIC_API_URL`: `https://<render-backend-name>.onrender.com/api/v1`

---

## 6. CORS Configuration Strategy

The backend currently invokes `app.enableCors()` with default wildcard settings.

For production, CORS should be configured to accept:
1. **Production Domain:** `https://wrightpay.vercel.app` (or custom domain).
2. **Preview Deployments:** `https://.*\.vercel\.app` (dynamic regex matching for Vercel pull-request branches).
3. **Local Development:** `http://localhost:3000` (for ongoing local development).

### Recommended Implementation Pattern:
```typescript
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  /^https:\/\/.*\.vercel\.app$/,
].filter(Boolean);

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
});
```

---

## 7. Environment Variable Matrix

| Variable Name | Environment | Target | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Backend | Render | Auto/Yes | Port on which NestJS listens (Render assigns dynamically, fallback 3001). |
| `NODE_ENV` | Backend | Render | Yes | Set to `production`. |
| `DATABASE_URL` | Backend | Render | Yes | Full PostgreSQL connection string with credentials & SSL mode. |
| `REDIS_URL` | Backend | Render | Yes | Full Redis connection string (supports TLS `rediss://`). |
| `JWT_SECRET` | Backend | Render | Yes | High-entropy cryptographic random string for signing auth tokens. |
| `JWT_EXPIRES_IN` | Backend | Render | Optional | Token validity duration (default: `1d`). |
| `CORS_ORIGIN` | Backend | Render | Optional | Comma-separated or single primary frontend origin URL. |
| `NEXT_PUBLIC_API_URL` | Frontend | Vercel | **Yes** | Base URL pointing to the live Render backend (`https://<app>.onrender.com/api/v1`). |

---

## 8. Render Service Configuration (Step-by-Step)

1. **Create PostgreSQL Database on Render**:
   - Name: `wrightpay-db`
   - Plan: Starter / Free
   - Copy the **Internal Database URL**.

2. **Create Redis on Render** (or Upstash Redis):
   - Name: `wrightpay-redis`
   - Plan: Starter / Free
   - Copy the **Internal Redis URL**.

3. **Create Web Service on Render**:
   - Repository: `ankitatpy/WrightPay`
   - Branch: `main-10098224823991460291`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`
   - Environment Variables:
     - `NODE_ENV` = `production`
     - `DATABASE_URL` = `<Internal Database URL>`
     - `REDIS_URL` = `<Internal Redis URL>`
     - `JWT_SECRET` = `<Generated 64-char Secret>`
     - `JWT_EXPIRES_IN` = `1d`
     - `CORS_ORIGIN` = `https://<vercel-app-name>.vercel.app`

---

## 9. Vercel Configuration (Step-by-Step)

1. **Import Repository on Vercel**:
   - Select `ankitatpy/WrightPay`.
2. **Project Settings**:
   - Framework Preset: `Next.js`
   - **Root Directory:** `frontend`
   - Build Command: `npm run build`
3. **Environment Variables**:
   - Add `NEXT_PUBLIC_API_URL` = `https://<render-web-service-url>.onrender.com/api/v1`
4. **Deploy**:
   - Trigger initial deployment.

---

## 10. Database Migration & Seed Strategy

1. **Initial Deployment**:
   - On first deployment to a fresh database, TypeORM `synchronize: true` will instantiate all tables and relations.
2. **Exchange Rates Population**:
   - Deploy or execute a dedicated one-time exchange rate seeder:
     - Rates for `EUR/USD`, `EUR/GBP`, `EUR/AED`, `EUR/PLN`, `EUR/INR` (and inverse pairs).
3. **Demo / Seed Users**:
   - In production, real users register via `/signup` and verify email with OTP.
   - If demo sandbox users are desired for testing on staging/production, they can be created through an optional seeding flag without wiping live tables.

---

## 11. Deployment Order

```text
Step 1: Provision Cloud Database (PostgreSQL)
  │
  ▼
Step 2: Provision Cloud Cache / Queue Store (Redis)
  │
  ▼
Step 3: Deploy Backend Web Service to Render (NestJS API + BullMQ Worker)
  │
  ▼
Step 4: Seed Baseline Exchange Rates in PostgreSQL
  │
  ▼
Step 5: Verify Backend Health & Swagger Endpoint (https://<app>.onrender.com/api/docs)
  │
  ▼
Step 6: Configure NEXT_PUBLIC_API_URL on Vercel
  │
  ▼
Step 7: Deploy Frontend to Vercel
  │
  ▼
Step 8: End-to-End Live Verification (Signup -> Wallet -> Quote -> Transfer -> BullMQ Settlement)
```

---

## 12. Rollback Strategy

- **Frontend (Vercel):**
  - Instant one-click rollback in Vercel Deployment history to the previous immutable deployment.
- **Backend (Render):**
  - Redeploy previous successful commit from the Render dashboard.
- **Database:**
  - Automated point-in-time recovery (PITR) or daily snapshot restore on managed PostgreSQL.

---

## 13. Production Risk Assessment & Mitigations

| Level | Risk Area | Description | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | **PostgreSQL SSL** | Cloud PostgreSQL hosts require SSL. Connection failure occurs if SSL is omitted. | Verify connection string includes `sslmode=require` or configure TypeORM `ssl` options. |
| **CRITICAL** | **Exchange Rates Seeding** | If exchange rates table is empty on fresh DB, all quotes & transfers will fail. | Run an idempotent exchange-rate seeder immediately after database provisioning. |
| **CRITICAL** | **Monorepo Root Directory** | If Vercel or Render builds from repository root without subfolder settings, builds will fail. | Explicitly configure Root Directory as `backend` on Render and `frontend` on Vercel. |
| **HIGH** | **Redis TLS Support** | Cloud Redis providers using `rediss://` may require TLS options in `ioredis` / `BullModule`. | Test `ioredis` connection with TLS flags enabled. |
| **HIGH** | **CORS Configuration** | Frontend calls will be blocked by browser if CORS does not whitelist the Vercel domain. | Configure dynamic origin check supporting Vercel production and preview domains. |
| **MEDIUM** | **Cold Starts on Free Tiers** | Free tier instances on Render spin down on inactivity, causing 30s-50s initial latency. | Recommend Render Starter ($7/mo) or uptime ping for production availability. |
| **LOW** | **Swagger in Production** | Public Swagger UI exposing API schemas. | Restrict or keep Swagger open as desired for developer review. |

---

## 14. Pre-Deployment Readiness Checklist

- [ ] PostgreSQL 16 database provisioned
- [ ] Redis 7 instance provisioned
- [ ] Render Web Service configured with `backend` root directory
- [ ] All environment variables configured in Render (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `NODE_ENV`)
- [ ] Backend deployed and responding with HTTP 200 on `/api/v1/exchange-rates`
- [ ] Exchange rates seeded into production PostgreSQL
- [ ] Vercel project configured with `frontend` root directory and `NEXT_PUBLIC_API_URL`
- [ ] Frontend deployed and tested against live backend
- [ ] Complete E2E user signup, login, wallet inspection, and transfer verified live

---

## 15. Phase 4A Implementation Status

The Phase 4A production-readiness code adjustments have been implemented and verified:

1. **CORS Configuration**:
   - `backend/src/main.ts` updated to dynamically resolve `FRONTEND_URL` environment variable while whitelisting `http://localhost:3000`, `http://127.0.0.1:3000`, and `^https:\/\/.*\.vercel\.app$` (for Vercel production and preview deployments).
   - Allows credentials (`credentials: true`) and explicitly permits `Content-Type`, `Authorization`, and `Idempotency-Key` headers without wildcard origins.

2. **PostgreSQL Cloud SSL Handling**:
   - `backend/src/app.module.ts` updated with dynamic SSL negotiation.
   - Activates `ssl: { rejectUnauthorized: false }` when `DATABASE_SSL=true` or when `DATABASE_URL` contains `sslmode=require` / `ssl=true`.
   - Defaults to `ssl: false` when connecting locally, ensuring zero breakage in local development.

3. **Redis & Rediss Compatibility**:
   - `backend/src/core/redis/redis.service.ts` and `backend/src/app.module.ts` (BullModule) updated to support both `redis://` and TLS `rediss://` schemes.
   - Automatically provides `tls: { rejectUnauthorized: false }` when `rediss://` is configured for managed cloud Redis providers (e.g. Render / Upstash).

4. **Production Environment Documentation**:
   - `backend/.env.example` and `frontend/.env.example` created/updated with comprehensive documentation of all production variables (`DATABASE_URL`, `DATABASE_SSL`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `IDEMPOTENCY_TTL_SECONDS`, `NEXT_PUBLIC_API_URL`).
   - Zero real credentials or secrets committed.

5. **Database Seed Strategy**:
   - Documented that `seed.ts` is strictly for local dev/testing due to destructive `TRUNCATE ... CASCADE`.
   - Recommended initial production seeding of baseline exchange rates (`EUR`, `USD`, `GBP`, `AED`, `PLN`, `INR`) via non-destructive SQL or dedicated migration.

6. **Frontend Production Configuration**:
   - `frontend/lib/api.ts` uses `process.env.NEXT_PUBLIC_API_URL` with local fallback.
   - `frontend/.gitignore` verified to ignore `.env*` while permitting `.env.example`.

7. **Verification Suite Results**:
   - Backend Build (`npm run build`): **PASS**
   - Backend Production Startup (`npm run start:prod`): **PASS** (In-process BullMQ worker initialized)
   - Backend Unit & Processor Regression Tests: **76/76 PASS**
   - Frontend Linter (`npm run lint`): **PASS** (0 errors, 0 warnings)
   - Frontend Typecheck (`npx tsc --noEmit`): **PASS** (0 type errors)
   - Frontend Production Webpack Build (`npx next build --webpack`): **PASS** (All 18 routes compiled and prerendered)


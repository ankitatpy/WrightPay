# WrightPay — SDET Quality Engineering & Test Automation Portfolio

Welcome to the **WrightPay Quality Assurance & Automation Repository**. This directory serves as the primary technical entry point for quality engineers, SDET hiring managers, and technical reviewers evaluating the end-to-end testing architecture of WrightPay.

---

> [!IMPORTANT]
> **Project Context & Architectural Scope:**  
> WrightPay was developed as an AI-assisted cross-border payment platform prototype and subsequently subjected to a rigorous, systematic, and independent SDET testing effort.  
> - **Simulated Financial Environment:** WrightPay does *not* interface with live banking payment rails, Visa/Mastercard networks, or actual UPI switches.
> - **Accounting Model:** The system implements an **atomic wallet balance debit with an append-only transaction ledger**; it is *not* a multi-currency double-entry core banking system.
> - **Zero Production Modifications:** All test suites, defect reproduction scripts, and performance harnesses operate strictly without modifying production application code.

---

## 1. Executive QA Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     WRIGHTPAY AUTOMATED QA VERIFICATION                         │
├──────────────────────────────────────────┬───────────┬──────────────┬────────────┤
│ Test Suite Layer                         │ Tooling   │ Target Scope │ Status     │
├──────────────────────────────────────────┼───────────┼──────────────┼────────────┤
│ 1. Frontend Functional E2E               │ Playwright│ Full UI Flow │ 49 / 49  ✓ │
│ 2. Accessibility (WCAG 2.1 AA)           │ Axe-Core  │ 12 Routes    │ 26 / 26  ✓ │
│ 3. Responsive Mobile / Tablet            │ Playwright│ 4 Viewports  │ 36 / 36  ✓ │
│ 4. Full-Stack API Error Handling         │ Playwright│ 4xx / 5xx    │ 44 / 44  ✓ │
│ 5. Session Expiry & 401 Lifecycle        │ Playwright│ Auth / Token │ 46 / 46  ✓ │
│ 6. Backend API Integration Baseline      │ Playwright│ PG/Redis/Bull│ 277/277  ✓ │
│ 7. Backend Unit & Pure Logic             │ Jest      │ Math / Crypto│ 130/130  ✓ │
├──────────────────────────────────────────┴───────────┴──────────────┴────────────┤
│ TOTAL VERIFIED FUNCTIONAL TESTS          : 608 / 608 (100% PASS RATE)            │
│ KNOWN-DEFECT REGRESSION SUITE            : 9 / 9 EXPECTED FAILS (Reproduced)     │
│ NON-FUNCTIONAL PERFORMANCE SUITE (k6)    : 6 / 6 SCENARIOS VERIFIED (124K+ reqs) │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. QA Philosophy & Test Strategy

The WrightPay QA architecture is built around three core engineering principles:

1. **Deterministic State Invariants Over Surface Verification:**
   - Rather than merely checking that an API returns HTTP 201, tests verify that PostgreSQL wallet balances decrement by the exact amount plus the 25.00 EUR fee, BullMQ queues enqueue matching job payloads, and Redis keys persist with 24-hour TTLs.
2. **Strict Defect Categorization:**
   - Documented issues are partitioned cleanly into **Confirmed Defects** (reproducible runtime bugs), **Architectural Risks** (dual-write and entropy limits), and **Product Limitations** (V1 scope boundaries).
3. **Multi-Layered Test Pyramid:**
   - Fast isolated Jest unit tests (< 2s) verify pure algorithms and crypto logic.
   - Integration tests verify live Docker containers (PostgreSQL 16, Redis 7, BullMQ).
   - Playwright route-interception suites stress frontend error states and session expiry.
   - k6 load scenarios measure actual p50/p95/p99 latencies and verify financial balance protection under concurrent load.

---

## 3. Master Artifact Map & Directory Index

| Artifact / Report | Purpose & Target Focus | File Location |
|---|---|---|
| **Master QA Final Report** | Comprehensive 28-section audit of the entire QA engagement | [`qa/QA_FINAL_REPORT.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/QA_FINAL_REPORT.md) |
| **Defect Inventory** | Authoritative catalog of all 25 confirmed defects & 2 architectural risks | [`qa/DEFECT_INVENTORY.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/DEFECT_INVENTORY.md) |
| **Test Execution Summary** | Breakdown of the 608 automated test inventory and regression execution | [`qa/TEST_EXECUTION_SUMMARY.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/TEST_EXECUTION_SUMMARY.md) |
| **Non-Functional Performance Report** | Measured k6 results: baseline, 8.2K req/s read load, transfers, and races | [`qa/NON_FUNCTIONAL_TEST_REPORT.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/NON_FUNCTIONAL_TEST_REPORT.md) |
| **Non-Functional Test Plan** | Workload design, financial constraints, and reliability scenario plan | [`qa/NON_FUNCTIONAL_TEST_PLAN.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/NON_FUNCTIONAL_TEST_PLAN.md) |
| **Accessibility Audit** | Axe-core scans across 12 routes with confirmed WCAG AA violations | [`qa/ACCESSIBILITY_AUDIT.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/ACCESSIBILITY_AUDIT.md) |
| **Responsive Mobile Audit** | Multi-viewport analysis uncovering fixed-sidebar mobile blockage | [`qa/RESPONSIVE_AUDIT.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/RESPONSIVE_AUDIT.md) |
| **API Error Handling Audit** | Full-stack error handling and state confusion analysis | [`qa/API_ERROR_HANDLING_AUDIT.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/API_ERROR_HANDLING_AUDIT.md) |
| **Session Expiry / 401 Audit** | Token eviction, React context disconnect, and polling lifecycle audit | [`qa/SESSION_EXPIRY_AUDIT.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/SESSION_EXPIRY_AUDIT.md) |
| **Jest / Unit Testing Audit** | Coverage audit and isolated pure logic unit test implementation | [`qa/JEST_UNIT_TEST_AUDIT.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/JEST_UNIT_TEST_AUDIT.md) |
| **Master Test Strategy** | High-level baseline testing strategy document | [`qa/WrightPay_Master_Test_Strategy.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/WrightPay_Master_Test_Strategy.md) |
| **Risk Register** | Risk assessment and failure mode prioritization register | [`qa/risk/WrightPay_Risk_Register.md`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/risk/WrightPay_Risk_Register.md) |
| **Playwright Automation Root** | End-to-end and API integration automation framework | [`qa/automation/`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/automation/) |
| **k6 Performance Scripts** | Standalone deterministic load and reliability testing scripts | [`qa/performance/`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/performance/) |

---

## 4. How to Reproduce Test Suites

### Prerequisites
- Node.js v20.x, npm v10.x
- Docker Desktop (PostgreSQL on port 5432, Redis on port 6379)
- Backend running on `http://localhost:3001` (`cd backend && npm run start:dev`)
- Frontend running on `http://localhost:3000` (`cd frontend && npm run dev`)

### 1. Run TypeScript Typechecking
```bash
# Verify QA automation types
cd qa/automation && npm run typecheck

# Verify Backend types
cd backend && npx tsc --noEmit
```

### 2. Run Isolated Backend Jest Unit Tests (130 Tests, ~2s)
```bash
cd backend
npm test -- --runInBand
```

### 3. Run Backend API Integration Baseline (277 Tests, ~15s)
```bash
cd qa/automation
npm run test:baseline
```

### 4. Run Known Defect Regression Suite (9 Tests, ~1.1s)
```bash
cd qa/automation
npm run test:defects
```

### 5. Run Frontend E2E, Accessibility, and Responsive Suites
```bash
cd qa/automation

# Frontend functional E2E (49 tests)
npm run test:ui

# Accessibility Axe scans (26 tests)
npm run test:accessibility

# Responsive multi-viewport tests (36 tests)
npm run test:responsive

# Session expiry / 401 tests (46 tests)
npx playwright test tests/ui/session

# API error handling tests (44 tests)
npx playwright test tests/ui/errors
```

### 6. Run k6 Performance & Reliability Suite (~75s)
```bash
# Execute all 6 deterministic scenarios
./qa/performance/run_all.sh
```

---

## 5. Key SDET Portfolio Highlights

- **Financial Double-Spend Protection:** Designed concurrency tests simulating simultaneous transfer bursts with the same idempotency key and verified PostgreSQL `FOR UPDATE` row-level locks prevent race conditions.
- **Defect Discovery Beyond Happy Path:** Identified critical gaps including missing BullMQ compensating refunds (`WP-QA-001`), unhandled UUID 500 errors (`WP-QA-003`), frontend card type casing mismatches (`WP-QA-009`), and React session state disconnects (`WP-QA-AUTH-001`).
- **High-Throughput Profiling:** Measured and characterized backend read throughput scaling to 8,272 req/s with sub-2.5ms p95 latencies using k6.

# WrightPay V1 — Responsive / Mobile QA Audit

**Phase:** 3B — Frontend Responsive Testing  
**Audit Date:** 2026-09-19  
**Auditor:** WrightPay SDET / Playwright QA Team  
**Production Code Modified:** ❌ No  

---

## Executive Summary

WrightPay V1 is built with a fixed-width sidebar layout (`w-64`, 256 px) that has **no responsive breakpoints, no mobile navigation drawer, and no hamburger menu**. This single architectural choice causes a cascade of failures across every dashboard page on mobile viewports (≤ 390 px). At tablet width (768 px) the situation is marginal — the sidebar is still full width and content is noticeably compressed.

**6 confirmed responsive defects** were discovered and documented with automated regression tests. These defects surface across every protected dashboard route and across both mobile viewports tested (375 × 812 and 390 × 844).

The public auth pages (`/login`, `/signup`, `/`) do **not** share the sidebar layout and behave correctly on mobile — they have no responsive defects.

---

## Test Coverage

| Viewport | Label | Tests Written |
|---|---|---|
| 375 × 812 | Mobile S (iPhone 12 mini) | Primary defect viewports |
| 390 × 844 | Mobile M (iPhone 14) | Secondary mobile confirm |
| 768 × 1024 | Tablet (iPad portrait) | Partial defect, compressed layout |
| 1280 × 800 | Desktop baseline | All pass — positive regression |

### Routes Covered

| Route | Mobile tested | Tablet tested | Desktop tested |
|---|---|---|---|
| `/` (Landing) | ✅ | ✅ | — |
| `/login` | ✅ | ✅ | — |
| `/signup` | ✅ | — | — |
| `/dashboard` | ✅ (defect) | ✅ (defect) | ✅ pass |
| `/dashboard/wallets` | — | ✅ | ✅ pass |
| `/dashboard/transactions` | ✅ (defect) | ✅ | ✅ pass |
| `/dashboard/send-money` | ✅ (defect) | ✅ | ✅ pass |
| `/dashboard/beneficiaries` | — | ✅ | ✅ pass |
| `/dashboard/cards` | ✅ (defect) | ✅ | ✅ pass |
| `/dashboard/profile` | — | ✅ | ✅ pass |

---

## Confirmed Defects

### WP-QA-RESP-001 — Sidebar Does Not Collapse on Mobile

| Field | Value |
|---|---|
| **Severity** | Critical |
| **Affected Viewports** | 375 × 812, 390 × 844, (768 × 1024 compressed) |
| **Affected Routes** | All `/dashboard/*` routes |
| **WCAG Equivalent** | WCAG 1.4.10 Reflow (AA) |
| **Root Cause** | `Sidebar.tsx` renders `<aside className="w-64 …">` — a fixed 256 px width with no responsive breakpoint |
| **Impact** | At 375 px the sidebar occupies **68% of the viewport** leaving only ~119 px for all page content. Dashboard is functionally unusable on real mobile hardware. |
| **No hamburger menu** | `DashboardLayout.tsx` renders `<Sidebar />` unconditionally — there is no mobile toggle, drawer, or `hidden md:block` breakpoint |
| **Automation** | `responsive.spec.ts` → `WP-QA-RESP-001` (test.fail) |

**Reproduction steps:**
1. Open any `/dashboard/*` route in a browser DevTools device emulation at 375 × 812.
2. Observe the sidebar fills most of the visible screen. No hamburger button exists.
3. All dashboard content is compressed into the residual ~119 px column on the right.

**Remediation (do not fix in this engagement):**
- Add `hidden lg:flex` to the sidebar and a mobile drawer with a hamburger toggle.
- Or use a collapsible navigation component at `md` breakpoint.

---

### WP-QA-RESP-002 — Dashboard Content Horizontally Clipped on Mobile

| Field | Value |
|---|---|
| **Severity** | Critical |
| **Affected Viewports** | 375 × 812, 390 × 844 |
| **Root Cause** | Direct consequence of RESP-001. The main content flex container occupies the residual width after the 256 px sidebar, resulting in ~119 px of usable content width. |
| **Impact** | Dashboard heading (`<h1>`), wallet balance cards, currency equivalents grid, and exchange rate banner are all partially or fully clipped beyond the right viewport edge. |
| **Automation** | `responsive.spec.ts` → `WP-QA-RESP-002` (test.fail) |

---

### WP-QA-RESP-003 — Transactions Table Overflows at 375 px

| Field | Value |
|---|---|
| **Severity** | High |
| **Affected Viewports** | 375 × 812, 390 × 844 |
| **Affected Routes** | `/dashboard/transactions` |
| **Root Cause** | The transactions table has 7 columns (`Date`, `Recipient`, `Amount`, `Fee`, `Exchange Rate`, `Status`, `Reference`) with `px-6` per cell. The wrapping `overflow-x-auto` container is functionally zero-width at 375 px due to RESP-001. The table overflows outside the page on mobile. |
| **Impact** | All column headers and data rows are clipped. Status filter buttons and the search-by-reference input stack vertically but may also overflow depending on the exact layout context. |
| **Automation** | `responsive.spec.ts` → `WP-QA-RESP-003` (test.fail) |

---

### WP-QA-RESP-004 — Send Money Wizard Progress Indicator Overflows at 375 px

| Field | Value |
|---|---|
| **Severity** | High |
| **Affected Viewports** | 375 × 812, 390 × 844 |
| **Affected Routes** | `/dashboard/send-money` |
| **Root Cause** | The wizard step indicator uses a fixed `flex` row with numbered circles and connector lines. At ~119 px available width the circles cannot fit on one line and the text "Step X of Y: …" truncates or wraps awkwardly. |
| **Impact** | The progress bar (step circles + connectors) is compressed beyond legibility. The "Next" and "Continue" buttons may also be clipped. |
| **Automation** | `responsive.spec.ts` → `WP-QA-RESP-004` (test.fail) |

---

### WP-QA-RESP-005 — Payment Card Items Clip Inner Content at 375 px

| Field | Value |
|---|---|
| **Severity** | High |
| **Affected Viewports** | 375 × 812, 390 × 844 |
| **Affected Routes** | `/dashboard/cards` |
| **Root Cause** | The cards grid switches to `grid-cols-1` at mobile, which is correct. However the card items have a fixed `h-52` height and `p-6` padding. At ~119 px residual width, the card number (`•••• •••• •••• XXXX`), cardholder name, expiry and type chip are all clipped by the reduced container width. |
| **Impact** | Payment card visual representation is broken — the last-four digits and cardholder name are truncated or hidden. Freeze / Unfreeze / Deactivate action buttons below the card may also overflow. |
| **Automation** | `responsive.spec.ts` → `WP-QA-RESP-005` (test.fail) |

---

### WP-QA-RESP-006 — Header "Sign Out" Button Clipped on Mobile

| Field | Value |
|---|---|
| **Severity** | High |
| **Affected Viewports** | 375 × 812, 390 × 844 |
| **Root Cause** | `Header.tsx` uses `px-8 py-4 flex items-center justify-between`. The header spans the full content area width. At 375 px with the sidebar, the effective header width is ~119 px. The avatar + sign-out button flex row overflows. |
| **Impact** | The "Sign out" button may be entirely off-screen on the right edge. Users on mobile cannot sign out from the header. |
| **Automation** | `responsive.spec.ts` → `WP-QA-RESP-006` (test.fail) |

---

## Negative Findings (No Defect Confirmed)

### Auth Pages — No Responsive Issues

The landing page (`/`), login (`/login`) and signup (`/signup`) pages do **not** use the `DashboardLayout` component. They have no sidebar and their forms / CTAs are all responsive at 375 px. No horizontal overflow was detected.

| Route | 375 px | Tablet |
|---|---|---|
| `/` | ✅ No overflow | ✅ No overflow |
| `/login` | ✅ No overflow, form fully visible | ✅ No overflow |
| `/signup` | ✅ No overflow | ✅ No overflow |

### Desktop Layout — Fully Functional

All dashboard routes at 1280 × 800 desktop render correctly:
- Sidebar is fully visible and not clipped
- Navigation items are all reachable
- Page headings, tables, and controls do not overflow
- The "Sign out" button is within viewport

---

## Test Architecture

### Spec File
[`qa/automation/tests/ui/responsive/responsive.spec.ts`](file:///Users/ankitpandey/Desktop/projects/WrightPay/qa/automation/tests/ui/responsive/responsive.spec.ts)

### Key Test Utilities
```typescript
// Check if an element's right edge exceeds the viewport
isHorizontallyOverflowing(page, selector): Promise<boolean>

// Check if document body is wider than viewport (page-level overflow)
hasPageOverflow(page): Promise<boolean>
```

### Running the Responsive Suite

```bash
# Run only the responsive test suite
npm run test:responsive

# Run the full frontend UI suite (includes responsive)
npm run test:ui
```

### Suite Breakdown

| Suite | Tests | Confirmed Defects |
|---|---|---|
| Navigation / Sidebar | 4 | 1 (`WP-QA-RESP-001`) |
| Dashboard Overview | 3 | 1 (`WP-QA-RESP-002`) |
| Transactions Table | 4 | 1 (`WP-QA-RESP-003`) |
| Send Money Wizard | 4 | 1 (`WP-QA-RESP-004`) |
| Cards Page | 4 | 1 (`WP-QA-RESP-005`) |
| Header | 3 | 1 (`WP-QA-RESP-006`) |
| Auth Pages | 4 | 0 |
| Landing Page | 3 | 0 |
| Beneficiaries Page | 3 | 0 |
| Profile Page | 2 | 0 |
| Wallets Page | 2 | 0 |
| **TOTAL** | **36** | **6** |

---

## Defect Summary Table

| ID | Title | Severity | Viewport | Root Cause |
|---|---|---|---|---|
| WP-QA-RESP-001 | Sidebar does not collapse on mobile | Critical | 375 / 390 px | Fixed `w-64` on `<aside>`, no responsive toggle |
| WP-QA-RESP-002 | Dashboard content clipped on mobile | Critical | 375 / 390 px | Downstream of RESP-001 |
| WP-QA-RESP-003 | Transactions table overflows at 375 px | High | 375 / 390 px | 7-column table + zero effective width |
| WP-QA-RESP-004 | Send Money wizard overflow at 375 px | High | 375 / 390 px | Fixed flex step indicator + RESP-001 |
| WP-QA-RESP-005 | Card display items clip content at 375 px | High | 375 / 390 px | Fixed height/padding + RESP-001 residual width |
| WP-QA-RESP-006 | Header Sign Out button clipped on mobile | High | 375 / 390 px | Flex justify-between + RESP-001 |

---

## Recommendations

> [!IMPORTANT]
> All 6 defects share the same root cause: `WP-QA-RESP-001`. Fixing the sidebar responsive behaviour will resolve or significantly reduce the severity of RESP-002 through RESP-006.

### Suggested Priority Order (for a future fix cycle)

1. **RESP-001** (Critical) — Implement responsive sidebar with mobile drawer/hamburger
2. **RESP-006** (High) — Make header responsive after sidebar fix
3. **RESP-003** (High) — Add `min-width` + confirmed horizontal scroll to table container
4. **RESP-004** (High) — Make step indicator wrap or stack vertically on mobile
5. **RESP-005** (High) — Reduce card item min-width or use `min-w-[280px]` in the grid
6. **RESP-002** (Critical) — Resolved automatically once RESP-001 is fixed

> [!NOTE]
> WrightPay V1 is a portfolio simulation. These defects are documented here for SDET portfolio purposes. No production code changes are included in this QA engagement.

---

*Generated by WrightPay SDET QA Pipeline — Phase 3B Responsive Audit*

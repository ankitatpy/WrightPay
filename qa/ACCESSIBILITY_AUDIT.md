# WrightPay Accessibility Audit

## Scope

This audit evaluates the accessibility (WCAG 2.1 Level AA) of the WrightPay cross-border payments web application frontend.

The following routes and UI states were scanned and evaluated:

1. **Public Landing Page** (`/`)
2. **Authentication — Login** (`/login`)
3. **Authentication — Signup** (`/signup`)
4. **Dashboard Overview** (`/dashboard`)
5. **Multi-Currency Wallets** (`/dashboard/wallets`)
6. **Send Money Transfer Wizard** (`/dashboard/send-money`)
7. **Transaction History** (`/dashboard/transactions`)
8. **Beneficiaries Management** (`/dashboard/beneficiaries`)
9. **Beneficiaries Add Modal** (`/dashboard/beneficiaries#modal`)
10. **Card Management** (`/dashboard/cards`)
11. **Cards Add Modal** (`/dashboard/cards#modal`)
12. **User Profile Settings** (`/dashboard/profile`)

Both light and dark theme viewports were considered, along with keyboard navigation, focus management, and screen reader semantic interoperability.

---

## Tooling

Automated accessibility scanning was conducted using **`@axe-core/playwright`** (v4.13.0) integrated directly into the WrightPay Playwright test framework (`accessibility.helper.ts` and `accessibility-scan.spec.ts`).

Scan rules were configured to target the following rule tags:
- `wcag2a` (WCAG 2.0 Level A)
- `wcag2aa` (WCAG 2.0 Level AA)
- `wcag21a` (WCAG 2.1 Level A)
- `wcag21aa` (WCAG 2.1 Level AA)
- `best-practice` (Industry accessibility best practices)

Raw scan results were captured and persisted to `qa/axe-scan-results.json` and `qa/reports/accessibility/axe-scan-results.json`.

---

## Automated Findings

The following accessibility defects were discovered via automated Axe scanning, inspected in the frontend codebase, reproduced, and confirmed as genuine product defects.

### WP-QA-A11Y-001 — Missing Form Label Associations on Profile Form Controls

- **Severity**: Critical
- **Route**: `/dashboard/profile`
- **Component**: `frontend/app/dashboard/profile/page.tsx` (`ProfileForm`)
- **Axe Rule**: `label`, `select-name`
- **WCAG**: 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)
- **Problem**: In the "Personal Information" section of the user profile, the form fields (First Name `<input>`, Last Name `<input>`, Email `<input>`, and Default Currency `<select>`) have visual text labels rendered as `<label>` elements. However, none of the `<label>` elements contain an `htmlFor` attribute, and none of the input/select elements contain an `id` attribute. Furthermore, neither `aria-label` nor `aria-labelledby` is defined.
- **User Impact**: Screen reader users navigating with Tab or virtual cursor focus hear generic announcements such as "edit text, blank" or "combobox, EUR" without being told what information is being requested (first name vs last name vs email).
- **Evidence**: 
  - Axe reported 3 `label` violations and 1 `select-name` violation.
  - Code inspect: `<label className="...">First Name</label><input type="text" value={firstName} ... />` (lines 72-111).
- **Reproduction**:
  1. Log into `/dashboard/profile`.
  2. Inspect the DOM for First Name, Last Name, and Default Currency controls.
  3. Verify that `id` and `htmlFor` are absent.
- **Automation Coverage**: `qa/automation/tests/ui/accessibility/accessibility-defects.spec.ts` (`WP-QA-A11Y-001`).
- **Recommended Remediation**: Add unique `id` attributes (e.g. `profile-first-name`, `profile-last-name`, `profile-email`, `profile-default-currency`) to all form controls and set matching `htmlFor` attributes on the corresponding `<label>` tags.

---

### WP-QA-A11Y-002 — Missing Accessible Names on Select Dropdowns in Add Beneficiary & Add Card Modals

- **Severity**: Critical
- **Route**: `/dashboard/beneficiaries#modal`, `/dashboard/cards#modal`
- **Component**: `frontend/app/dashboard/beneficiaries/page.tsx`, `frontend/app/dashboard/cards/page.tsx`
- **Axe Rule**: `select-name`
- **WCAG**: 4.1.2 Name, Role, Value (Level A)
- **Problem**: 
  - In the Add Beneficiary modal, the Currency `<select>` and Payout Method `<select>` elements lack programmatic associations with their visual `<label>` tags.
  - In the Add Card modal, the Card Type `<select>`, Expiry Month `<select>`, and Expiry Year `<select>` elements lack programmatic labels. The month and year dropdowns share a single visual `<label>Expiry Date *</label>` without individual accessible names or group labels.
- **User Impact**: Non-sighted users attempting to add a beneficiary or register a card cannot tell which dropdown controls the currency versus payout method, or month versus year.
- **Evidence**: 
  - Axe reported `select-name` violations on both modals.
  - Code inspect: `beneficiaries/page.tsx:372` and `cards/page.tsx:460,491,502`.
- **Reproduction**:
  1. Navigate to `/dashboard/beneficiaries` and click "Add Beneficiary".
  2. Inspect the Currency and Payout Method `<select>` elements: neither has an `id`, `aria-label`, or `aria-labelledby`.
  3. Navigate to `/dashboard/cards` and click "Add Card": inspect Card Type and Expiry dropdowns.
- **Automation Coverage**: `qa/automation/tests/ui/accessibility/accessibility-defects.spec.ts` (`WP-QA-A11Y-002`).
- **Recommended Remediation**: Assign unique `id`s to the dropdowns and link with `htmlFor` on labels, and provide explicit `aria-label="Expiry month"` and `aria-label="Expiry year"` on the grouped expiry dropdowns.

---

### WP-QA-A11Y-003 — Insufficient Color Contrast on Live Rates Banner and Secondary Currency Codes

- **Severity**: Serious
- **Route**: `/dashboard`, `/dashboard/wallets`
- **Component**: `frontend/components/ExchangeRateBanner.tsx`, `frontend/components/WalletCard.tsx`
- **Axe Rule**: `color-contrast`
- **WCAG**: 1.4.3 Contrast (Minimum) (Level AA)
- **Problem**:
  - In `ExchangeRateBanner.tsx`: The label `<span class="text-slate-500 ml-2">Live rates</span>` (#62748e) on `#0f172b` background has a contrast ratio of **3.74:1**, failing the WCAG AA minimum threshold of **4.5:1** for regular text (14px).
  - In `WalletCard.tsx`: Non-default currency cards render currency code labels (`<div class="text-2xl font-bold text-slate-400 dark:text-slate-500">GBP</div>`, etc.) with text color `#90a1b9` against white background `#ffffff`. The contrast ratio is **2.63:1**, failing the WCAG AA threshold of **3.0:1** for large text (24px bold).
- **User Impact**: Users with moderate low vision, presbyopia, or those operating devices under high glare or low brightness cannot comfortably discern the live exchange rates status or currency card identifiers.
- **Evidence**: Axe scan flags `.ml-2:nth-child(7)` with contrast 3.74:1 and `.text-slate-400.text-2xl` with contrast 2.63:1.
- **Reproduction**: Run Axe contrast analysis or inspect computed foreground and background colors in DevTools.
- **Automation Coverage**: `qa/automation/tests/ui/accessibility/accessibility-defects.spec.ts` (`WP-QA-A11Y-003`).
- **Recommended Remediation**: In `ExchangeRateBanner.tsx`, change `text-slate-500` to `text-slate-400` or `text-slate-300` (yielding > 5.5:1 contrast). In `WalletCard.tsx`, change `text-slate-400` to `text-slate-600` on light background (yielding > 4.5:1 contrast).

---

### WP-QA-A11Y-004 — Missing `<main>` Landmark and Region Containers on Auth and Public Pages

- **Severity**: Moderate
- **Route**: `/`, `/login`, `/signup`
- **Component**: `frontend/app/page.tsx`, `frontend/app/login/page.tsx`, `frontend/app/signup/page.tsx`
- **Axe Rule**: `landmark-one-main`, `region`
- **WCAG**: 1.3.1 Info and Relationships (Level A), 2.4.1 Bypass Blocks (Level A)
- **Problem**: On `/` (Landing), `/login`, and `/signup`, the primary body content is wrapped in non-semantic `<div>` elements without a `<main>` landmark. Additionally, sections on the landing page (Hero, Features, CTA) are not enclosed within any landmark.
- **User Impact**: Screen reader users navigating by landmarks cannot jump directly to the primary interaction area (e.g. login form, signup form, landing hero) and must tab through all DOM elements sequentially.
- **Evidence**: Axe reported `landmark-one-main` and `region` violations on all three routes.
- **Reproduction**: Inspect the outer DOM of `/login`: observe `<div className="min-h-screen...">` with no `<main>` child.
- **Automation Coverage**: `qa/automation/tests/ui/accessibility/accessibility-defects.spec.ts` (`WP-QA-A11Y-004`).
- **Recommended Remediation**: Wrap the core content or card in `<main className="...">` on `/login` and `/signup`, and wrap the hero, feature, and CTA sections in `<main>` on `/`.

---

### WP-QA-A11Y-005 — Broken Heading Hierarchy Skipping Structural Levels Across Pages

- **Severity**: Moderate
- **Route**: `/`, `/dashboard/wallets`, `/dashboard/beneficiaries`, `/dashboard/cards`
- **Component**: `frontend/app/page.tsx`, `frontend/app/dashboard/wallets/page.tsx`, `frontend/app/dashboard/beneficiaries/page.tsx`, `frontend/app/dashboard/cards/page.tsx`
- **Axe Rule**: `heading-order`
- **WCAG**: 1.3.1 Info and Relationships (Level A)
- **Problem**: 
  - On `/`: The footer navigation column headings render as `<h4>Product</h4>`, `<h4>Company</h4>`, etc., directly following an `<h2>` section header, skipping level `<h3>`.
  - On `/dashboard/wallets`: The page title is `<h1>Your Wallets</h1>`. The next heading is `<h3 className="...">Coming Soon</h3>`, skipping level `<h2>`.
  - On `/dashboard/beneficiaries`: The page title is `<h1>Beneficiaries</h1>`. The next heading in empty or add state is `<h3 className="...">Add a Beneficiary</h3>`, skipping level `<h2>`.
- **User Impact**: Screen reader users navigating via heading keys (e.g., VoiceOver Rotor, JAWS/NVDA `H` and `1-6` keys) receive an inconsistent page outline, making logical hierarchy confusing.
- **Evidence**: Axe reported `heading-order` violations across 4 routes.
- **Reproduction**: Inspect heading tags in DOM tree: verify `h1` directly followed by `h3`.
- **Automation Coverage**: `qa/automation/tests/ui/accessibility/accessibility-defects.spec.ts` (`WP-QA-A11Y-005`).
- **Recommended Remediation**: Adjust heading levels so headings descend without skips (e.g., change `<h3>Coming Soon</h3>` to `<h2>Coming Soon</h2>` or add an intermediate section `<h2>`).

---

### WP-QA-A11Y-006 — Missing Modal Dialog Roles, ARIA Attributes, and Accessible Close Controls

- **Severity**: Serious
- **Route**: `/dashboard/beneficiaries#modal`, `/dashboard/cards#modal`
- **Component**: Beneficiary Modal (`beneficiaries/page.tsx`), Add Card Modal (`cards/page.tsx`)
- **Axe Rule**: N/A (Manual / WAI-ARIA Authoring Practices)
- **WCAG**: 4.1.2 Name, Role, Value (Level A), 1.3.1 Info and Relationships (Level A)
- **Problem**:
  - Modal containers are constructed using generic `<div>` tags (`<div className="fixed inset-0...">`) without `role="dialog"` or `role="alertdialog"`.
  - Modals lack `aria-modal="true"`.
  - Modals lack `aria-labelledby` referencing their header (`<h2>Add New Beneficiary</h2>`, `<h2>Add Payment Card</h2>`).
  - Close buttons render a raw symbol `✕` without `aria-label="Close modal"` or visually hidden text.
- **User Impact**: Screen reader users are not notified that a modal dialog has opened. The close button is announced as "multiplication" or "cross", leaving users confused about its purpose.
- **Evidence**: Inspection of `beneficiaries/page.tsx:333-344` and `cards/page.tsx:422-433`.
- **Reproduction**: Trigger either modal and inspect the dialog DOM node in Chrome DevTools Accessibility tree: role is generic `generic` instead of `dialog`.
- **Automation Coverage**: `qa/automation/tests/ui/accessibility/accessibility-defects.spec.ts` (`WP-QA-A11Y-006`).
- **Recommended Remediation**: Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="modal-title"` to the modal container, and add `aria-label="Close dialog"` to the close button.

---

### WP-QA-A11Y-007 — Missing Keyboard Focus Trapping and Escape-Key Dismissal in Modals

- **Severity**: Serious
- **Route**: `/dashboard/beneficiaries#modal`, `/dashboard/cards#modal`
- **Component**: Beneficiary Modal (`beneficiaries/page.tsx`), Add Card Modal (`cards/page.tsx`)
- **Axe Rule**: N/A (Manual Behavioral Verification)
- **WCAG**: 2.1.1 Keyboard (Level A), 2.1.2 No Keyboard Trap (Level A), 2.4.3 Focus Order (Level A)
- **Problem**:
  - When a modal is opened, pressing the `Escape` key has no effect; the modal remains open.
  - Tab navigation is not trapped within the modal boundary: tabbing past the "Cancel" button shifts keyboard focus out to the address bar and background DOM elements behind the modal backdrop.
  - Closing a modal does not restore focus back to the triggering element ("Add Beneficiary" or "Add Card"), leaving focus on the document `body`.
- **User Impact**: Sighted keyboard-only users cannot quickly close dialogs using the standard `Escape` convention, and tabbing cycles through invisible background controls while a modal is visually overlaying the screen.
- **Evidence**: Playwright keyboard interaction tests demonstrate `Escape` does not close modals and focus leaves modal boundaries.
- **Reproduction**:
  1. Open Add Beneficiary modal.
  2. Press `Escape`: modal remains visible.
  3. Tab through all controls to "Cancel", press `Tab`: focus leaves modal container.
- **Automation Coverage**: `qa/automation/tests/ui/accessibility/accessibility-defects.spec.ts` (`WP-QA-A11Y-007`).
- **Recommended Remediation**: Add a `useEffect` attaching a `keydown` handler for `e.key === 'Escape'`, implement a focus trap cycling between first and last focusable modal elements, and restore focus to triggering button on modal close.

---

### WP-QA-A11Y-008 — Data Table Column Headers Lack `scope="col"` and Search Form Lacks Association

- **Severity**: Minor
- **Route**: `/dashboard/transactions`
- **Component**: `frontend/app/dashboard/transactions/page.tsx`
- **Axe Rule**: N/A (Manual / WCAG Table Semantics)
- **WCAG**: 1.3.1 Info and Relationships (Level A)
- **Problem**:
  - The transaction history table renders 7 column headers (`<th>Date</th>`, `<th>Recipient</th>`, `<th>Amount</th>`, `<th>Fee</th>`, `<th>Exchange Rate</th>`, `<th>Status</th>`, `<th>Reference</th>`), but none of them define `scope="col"`.
  - The "Search by reference" input lacks an `id`, and its visual label lacks `htmlFor`.
- **User Impact**: Screen reader users reading table data cell-by-cell in table navigation mode may not have the corresponding column header announced automatically for each data cell.
- **Evidence**: Code inspection of `transactions/page.tsx:131-172`.
- **Reproduction**: Inspect `<th>` elements in the transactions table: verify absence of `scope="col"`.
- **Automation Coverage**: `qa/automation/tests/ui/accessibility/accessibility-defects.spec.ts` (`WP-QA-A11Y-008`).
- **Recommended Remediation**: Add `scope="col"` to every `<th>` element in the transactions table and link the search input with `id="tx-search-ref"` and `htmlFor="tx-search-ref"`.

---

### WP-QA-A11Y-009 — Sidebar Navigation Lacks Accessible Name, `aria-current="page"`, and Introduces Duplicate `<h1>`

- **Severity**: Minor
- **Route**: All dashboard routes
- **Component**: `frontend/components/Sidebar.tsx`
- **Axe Rule**: N/A (Manual Review)
- **WCAG**: 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)
- **Problem**:
  - The sidebar renders `<h1 className="text-2xl font-bold ...">WrightPay</h1>`, which conflicts with the page-level `<h1>` headings (`<h1>Your Wallets</h1>`, `<h1>Beneficiaries</h1>`, etc.), producing multiple `<h1>` headings per dashboard view.
  - The `<nav>` element lacks an `aria-label` to identify its navigation landmark.
  - Active navigation links rely purely on Tailwind styling (`bg-blue-50 text-blue-600`) without `aria-current="page"`.
- **User Impact**: Screen reader users cannot tell which navigation link represents the currently active page and encounter duplicate `<h1>` titles on all dashboard routes.
- **Evidence**: Inspection of `Sidebar.tsx:20-44`.
- **Reproduction**: Open any dashboard page, inspect sidebar nav links: active link lacks `aria-current`.
- **Automation Coverage**: `qa/automation/tests/ui/accessibility/accessibility-defects.spec.ts` (`WP-QA-A11Y-009`).
- **Recommended Remediation**: Change sidebar title to a styled `<div>`, add `aria-label="Main Navigation"` to `<nav>`, and conditionally apply `aria-current={isActive ? 'page' : undefined}` to navigation links.

---

## False Positives / Not Applicable

The following findings were evaluated during the audit but determined NOT to be product defects:

1. **StatusBadge Color Reliance (Hypothesis: WCAG 1.4.1 Use of Color violation)**:
   - *Observation*: Initial heuristic audit raised whether status badges (Completed, Pending, Failed) rely solely on color to communicate state.
   - *Verification*: Inspection of `frontend/components/StatusBadge.tsx` revealed that every badge renders explicit, visible text labels ("Completed", "Pending", "Failed", "Processing", "Suspicious") inside the element. Color is used purely as a supplementary visual cue.
   - *Conclusion*: **Not a defect (False Positive)**. Meets WCAG 1.4.1 requirements.

2. **Send Money Initial Page Scan Violations Count (0 Violations)**:
   - *Observation*: Automated scan of `/dashboard/send-money` returned 0 violations.
   - *Verification*: On initial page load, the Send Money page displays Step 1 (Beneficiary selection), which consists of list cards without inputs. The inputs on Step 3 (Amount) and Step 4 (Currency select) only mount when the user progresses through the wizard.
   - *Conclusion*: **Not an Axe false positive, but an artifact of dynamic step rendering**. Defects in later steps were identified via manual inspection and codified in test specs.

3. **Dashboard Scans Timing Out During Auth Loading**:
   - *Observation*: If an automated scan executes before the initial `isLoading` spinner in `DashboardLayout` resolves, Axe reports missing `main` and missing headings.
   - *Verification*: Once the authenticated session is verified and `headerGreeting` renders, `DashboardLayout` properly provides `<main>`, `<header>`, and `<aside>`.
   - *Conclusion*: **Transient test timing artifact**, resolved by explicitly awaiting `dashboardPage.headerGreeting` before scanning.

4. **Safari Keyboard Scroll on `<main class="overflow-auto">` (`scrollable-region-focusable`)**:
   - *Observation*: Axe flagged `scrollable-region-focusable` on `<main>` on `/dashboard/wallets`.
   - *Verification*: In Chromium and Firefox, overflowing containers with focusable children can be scrolled naturally via keyboard arrows. Adding `tabindex="0"` to `<main>` can create an extraneous tab stop for non-overflowing desktop viewports.
   - *Conclusion*: **Informational / Browser-specific behavior**. Not classified as a blocker defect.

---

## Manual Accessibility Observations

Axe is an automated heuristic scanner and by design catches ~30-40% of WCAG criteria. The following behavioral accessibility characteristics were reviewed manually:

| Area | Verified Behavior | Defect ID |
|------|-------------------|-----------|
| **Keyboard Tab Navigation** | Interactive controls (links, buttons, inputs) on Login, Signup, and Dashboard are reachable via Tab key. | Working as expected |
| **Enter/Space Key Activation** | Buttons (Sign out, Filter buttons, modal open buttons) respond to Enter and Space keys. | Working as expected |
| **Modal Focus Placement** | Focus is NOT automatically moved into the modal when opened. | WP-QA-A11Y-007 |
| **Modal Focus Trapping** | Focus is NOT trapped inside modal dialogs; Tab escapes to background. | WP-QA-A11Y-007 |
| **Escape Key Dismissal** | Neither Beneficiaries nor Cards modal listens to `Escape` key. | WP-QA-A11Y-007 |
| **Focus Restoration** | When closing modals, focus is not restored to the triggering button. | WP-QA-A11Y-007 |
| **Close Button Accessible Name** | Modal close button uses raw symbol `✕` without `aria-label`. | WP-QA-A11Y-006 |
| **Dialog Semantics** | Modals lack `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. | WP-QA-A11Y-006 |
| **Table Header Semantics** | Transaction table `<th>` elements lack `scope="col"`. | WP-QA-A11Y-008 |
| **Active Nav Indication** | Sidebar active link lacks `aria-current="page"`. | WP-QA-A11Y-009 |
| **Dynamic State Announcements** | Transfer progress and error alerts lack `aria-live="polite"` / `role="alert"`. | Manual Observation |

---

## Coverage

### Automated Scans Executed
- `/` (Landing)
- `/login` (Sign In)
- `/signup` (Sign Up)
- `/dashboard` (Overview)
- `/dashboard/wallets` (Wallets)
- `/dashboard/send-money` (Send Money Wizard)
- `/dashboard/transactions` (Transactions History)
- `/dashboard/beneficiaries` (Beneficiaries List)
- `/dashboard/beneficiaries#modal` (Add Beneficiary Dialog)
- `/dashboard/cards` (Cards List)
- `/dashboard/cards#modal` (Add Card Dialog)
- `/dashboard/profile` (Profile Settings)

### Manual Codebase Review Conducted
- `frontend/app/page.tsx`
- `frontend/app/login/page.tsx`
- `frontend/app/signup/page.tsx`
- `frontend/components/DashboardLayout.tsx`
- `frontend/components/Header.tsx`
- `frontend/components/Sidebar.tsx`
- `frontend/components/WalletCard.tsx`
- `frontend/components/StatusBadge.tsx`
- `frontend/components/ExchangeRateBanner.tsx`
- `frontend/app/dashboard/page.tsx`
- `frontend/app/dashboard/wallets/page.tsx`
- `frontend/app/dashboard/send-money/page.tsx`
- `frontend/app/dashboard/transactions/page.tsx`
- `frontend/app/dashboard/beneficiaries/page.tsx`
- `frontend/app/dashboard/cards/page.tsx`
- `frontend/app/dashboard/profile/page.tsx`

---

## Limitations

This document represents an **internal engineering accessibility audit** and **SDET regression testing baseline**. 

It does **NOT** constitute a formal, certified WCAG 2.1 AA Compliance Certification. Formal compliance certification requires extensive independent assistive technology testing with multiple screen reader / browser combinations (e.g. JAWS on Windows with Edge, NVDA on Windows with Chrome, VoiceOver on macOS with Safari, and TalkBack on Android), manual user testing with individuals with disabilities, and exhaustive accessibility conformance documentation (VPAT).

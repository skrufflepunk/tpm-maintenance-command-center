# TPM Maintenance Command Center

Phases 1–5 of an internal, read-only maintenance dashboard. The working Overview uses **fictional demo data only**. Rentvine remains the intended source of truth for future operational versions; there is no live Rentvine connection, source mutation or messaging. Work Order Explorer can preview and load synthetic or approved redacted CSVs into an isolated in-memory evaluation session.

## Run locally

Requires Node.js 22.12+ (validated here with Node 24.22.1 and npm 11.9.0).

```bash
npm ci
npm run dev -- --port 5173
```

Run these commands from the repository root. In a cloud environment where npm's default home cache is not writable, use `npm ci --cache /workspace/.npm-cache` instead. The Vite server binds to `0.0.0.0` for private cloud development; use the environment's supported private forwarding mechanism if available. Do not expose this development server publicly. Live processes must be restarted in a new task. Use the existing isolated checkout; no Git worktree is needed.

Configuration is optional for this demo. `.env.example` documents the single supported public setting, `VITE_DATA_MODE=demo`. Omitted mode defaults to demo; any other mode fails closed. All `VITE_` values are public. Never add credentials to them. No API credentials or external services are needed.

## Phase 1 behavior

- Responsive navy/blue application shell with exactly six tabs. All six pages are implemented through Properties and Analytics. Overview filters are preserved independently from Explorer filters.
- Morning Briefing, five KPI drill-downs, monthly creation/completion activity, interactive age/category breakdowns, deterministic follow-up queue, property summaries, completion durations, data health and read-only record details.
- Search, multi-select property/status/vendor/category/priority/age filters, creation-date ranges, removable filter chips, clear-all and explicit empty states. Filter families combine with AND; choices within a family combine with OR.
- All metrics and drill-downs use the same scoped records. Charts expose exact counts and keyboard-operable drill-downs; monthly activity also has an accessible table. Age/category counts remain readable as text.
- Native modal dialogs, focus return, navigation focus management, skip link, labeled controls, visible focus and reduced-motion support. Automated accessibility checks supplement browser interaction tests; they are not a complete accessibility certification.
- Validated, session-only rule editing for proposed aging, bucket, freshness and history thresholds. Queue ordering is configurable in `src/config/rules.ts`; it defaults to source urgent, pending approval, aging, then explicit unassignment, with descending age and stable ID tie-breaks.

The fixture has 24 deterministic fictional work orders, 3 fictional properties and 3 fictional vendors, including missing dates, unknown statuses/assignments and an unknown property relationship. Its fixed report time is November 13, 2026 at 14:00 UTC. The illustrative timezone is `America/Mexico_City`; it is **not an approved portfolio timezone**. Viewing time, report time and synthetic load time are shown separately. Freshness is evaluated against viewing time; the fixture never claims to be live.

No previous snapshot exists, so comparisons and no-observed-change nudges are explicitly unavailable. Unknown values are never treated as zero or as evidence of assignment absence. Completion durations keep calendar-date and elapsed-timestamp pairs separate. The navy/blue palette and generic decorative palm are provisional, not an approved TPM brand match.

## Code map

| Location                | Responsibility                                                 |
| ----------------------- | -------------------------------------------------------------- |
| `src/app`               | Shell, navigation, loading, shared scope and dialogs           |
| `src/features/vendors`  | Vendor directory, profiles, workload, CSV and local drafts     |
| `src/features/overview` | Working dashboard                                              |
| `src/components`        | Shared filters, table, modal, palm and rule settings           |
| `src/domain`            | Typed contracts, pure rules, selectors and labels              |
| `src/data`              | Synthetic fixture and asynchronous repository/adapter boundary |
| `src/config/rules.ts`   | Validated versioned demo rules                                 |
| `src/styles.css`        | Tailwind semantic tokens and responsive components             |
| `tests`                 | Real Chromium browser tests                                    |

The repository interface includes `getSnapshot`, `getDataHealth`, `previewImport`, `commitImport` and `getComparableChanges`. Phase 1 advertises no import/comparison/source-link capabilities. The demo adapter still rejects import mutations. The separate `CsvSession` evaluation adapter validates and atomically replaces its own in-memory snapshot; it does not alter the demo or authorize operational data access. No unverified CSV header or Rentvine endpoint is assumed. See ARCHITECTURE.md and DATA_SCHEMA.md.

## Verification

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

`build` runs strict TypeScript checking and the production Vite bundle. `test` runs domain and repository tests. `test:e2e` starts Vite automatically when needed and runs the desktop browser matrix, including count reconciliation, filters, all six navigation destinations, chart and record drill-downs, settings, data health, dialog keyboard behavior and automated WCAG scans. A 720 CSS-pixel viewport checks reflow equivalent to a 1440px desktop at 200% zoom.

Browser tests use native Chrome when prepared, otherwise `/usr/bin/chromium`. Set `CHROME_PATH`, `EDGE_PATH` or `CHROMIUM_PATH` for installed executables. Edge joins the matrix when available. Screenshots and any retained failure traces are written under ignored `test-results/`. There is no backend authentication to test; **do not use this demo for operational data**. Anonymous-access denial, production roles, private storage and Google Sites authentication remain prerequisites for any operational deployment.

## Specifications and remaining decisions

Read AGENTS.md and the seven other specifications before implementation. PROJECT.md defines scope, DESIGN_SYSTEM.md presentation, FEATURES.md behavior, DATA_SCHEMA.md contracts, ARCHITECTURE.md boundaries and BUSINESS_RULES.md calculations. Their full release criteria extend beyond Phase 1.

Still needed for later phases: approved TPM assets/colors, portfolio timezone and thresholds, reviewed sanitized export headers/mappings, retention, protected hosting/access provider, importer permissions, CSV pipeline and optional verified read-only API access. No Supabase dependency or API access is required for this phase. Do not commit real CSVs, private reports, screenshots, credentials, contact details or entry codes.

No application deployment is included. See REVIEW.md for review scope and verification evidence.

## Tropical Overview presentation
The reference-led visual redesign keeps the existing fictional dataset and data layer. Five color-coded KPIs, a status donut, vendor workload, property heatmap, compact sortable table, tropical header/sidebar and sidebar navigation complement the original dashboard controls. The right rail provides rule-based snapshot counts and working data-health/record actions. AI assistance, Rentvine access and a recent-activity event feed are explicitly unavailable. CSV evaluation is available through the Work Order Explorer. The artwork is original inline SVG, with provisional branding. Screenshots are generated as review artifacts outside source control.

## Phase 2 · Work Order Explorer
Open **Work Orders** to search and sort the register, filter by property/status/vendor/category/priority/owner approval/created-date range/active age, inspect scoped summary cards and open read-only details. Pagination offers 10, 25 or 50 rows. Dates and ages sort as typed values; missing values stay last. Aging highlights follow the configurable rule; pending approval is highlighted only when explicitly supplied. Approval waiting time is unavailable without a request date. Details show normalized source fields, coverage and the available date/history evidence.

Use **Import CSV** for the isolated evaluation workflow:

1. Confirm the file is synthetic or approved redacted evaluation data; choose a UTF-8 comma-separated file (2 MiB / 10,000 rows maximum).
2. Supply source account, report scope/comparison key and timezone, and source report time when known.
3. Map actual file headers to documented normalized fields. A stable work-order ID is required. Leave absent fields unmapped. Review mappings for every supplied status, priority, approval and assignment value; unmapped values stay Unknown.
4. Select **Validate & preview**, inspect normalized sample rows and warnings, then **Load validated CSV session**. Rejected candidates cannot load and preserve existing records. Duplicate replays do not add records or history.
5. Switch between fictional demo and CSV using **Current data source**, or clear the CSV session. No demo rows, properties or vendors are merged into CSV data. The CSV source is retained across in-app navigation but disappears on browser reload.

There are no verified Rentvine export headers or production source mappings in this repository. This evaluator accepts only explicitly mapped columns and does not guarantee compatibility with an uninspected export. It does not provide operational authentication, shared import authorization/storage, automated privacy redaction, live API access or production retention. Do not load private operational files. No CSV data leaves browser memory, is written to browser storage, or is committed to Git. Overview remains the working fictional demo and is unaffected by Explorer imports. No new dependencies are required.

New tests cover CSV quoted syntax/limits, unknowns, duplicate identity rejection, invalid dates, assignment coverage, transactional preview/commit, idempotency, stale candidates, scoped comparison/history, filters, typed sorting, pagination, source separation, record details and accessibility.

Review scope and final Phase 2 validation evidence: [PHASE2_REVIEW.md](PHASE2_REVIEW.md).

## Desktop-first Phase 2 refinements
The approved design remains intact. The navy sidebar is the only primary navigation and stays visible during page scrolling; its navy background also covers the full document. Explorer now has one heading and seven priority columns, with secondary metadata in details and a sort selector. Interactive KPI buttons narrow the current register using existing rules; Reset KPI filter keeps other filters, and Clear Explorer filters resets everything. CSV import remains functional as a less prominent fallback.

The default browser matrix targets 1366, 1440 and 1920px in Chrome (Chromium fallback), plus 1440px in Edge when installed. Tests include a local 1060×620 iframe to exercise a content viewport smaller than the browser. This does **not** establish protected Google Sites authentication/session/framing compatibility; the real portal must be tested before operational release. No cross-origin resize messaging, permissive production framing policy or authorization bypass is added.

Optional native browser preparation on the Linux cloud machine (Python, curl, dpkg-deb required):

```bash
python3 scripts/prepare-desktop-browsers.py
npm run test:e2e
```

The script fetches Chrome/Edge from official package manifests, preserves TLS verification, verifies each package SHA-256, and extracts runtimes outside the checkout under `/workspace/browser-cache`. `TPM_BROWSER_CACHE` can select another writable cache directory. Browser installation is optional for basic Chromium checks. Prior mobile coverage remains opt-in with `LEGACY_MOBILE_TESTS=1 npm run test:e2e -- --project=mobile`; no new mobile interface or routine mobile screenshots are part of this phase.

`src/config/sourceLinks.ts` contains an intentionally empty verified-origin list. A future reviewed adapter must supply actual verified record URLs, and the account owner must verify the exact HTTPS origin before links are enabled. CSV never creates or imports arbitrary links. Empty, relative, non-HTTPS, credential-bearing and unapproved-origin links remain unavailable. This prepares a read-only action, not an API integration. The subsequent user request authorized Phase 3 Action Center development.

## Phase 3 · Action Center
Open **Action Center** for a daily rules-based operations queue. Its source selector is shared with Explorer: load/clear CSV in Explorer, then review that isolated snapshot in Action Center. Switching to demo never merges CSV rows, directories or drafts. Overview remains its own fictional demo.

Five KPI cards filter unique work orders requiring follow-up, configured aging, pending approvals, explicit unassignment and scheduled review. Scheduling is explicitly Unavailable because the source contract has no appointment fields. Morning Briefing groups urgency, approvals, vendor coordination, aging and other observed-change follow-ups using exactly the same ActionItem set. Default ordering uses the proposed shared rule configuration; search, filters, sorting, pagination and record inspection remain read-only.

Open a record or **Draft Follow-up** to inspect facts and recommendations, choose Owner/Tenant/Vendor, edit a natural plain-text template, and **Copy draft**. Nothing is sent. Edits are kept separately per recipient only while the panel is open and disappear when it closes or changes source. No names, addresses, contact records, AI integration or browser storage are needed. **Open corresponding work order in Explorer** opens the exact scoped record without losing the selected dataset.

No-observed-change suggestions require sufficiently spaced, compatible retained CSV observations with known unchanged fields and stable coverage. The fixed demo has no prior pair, so this capability is unavailable there. This is not a complete activity history, a missed-appointment detector or evidence of a party failing to respond. Source scheduling, approval duration and full source activity remain unavailable. New action/template unit tests and desktop Chrome/Edge/iframe checks supplement all existing Phase 1/2 regression suites. No live Rentvine connection, external message, source write, merge or public deployment is included.


## Phase 4 · Vendor Watch
Open **Vendors** for the searchable/sortable/paginated vendor directory and linked follow-up workspace. Five KPI cards distinguish vendor counts from aged assigned work-order counts. Profiles show all supplied vendor fields, workload by category, current/completed/aged report records and completion means with sample/exclusion/precision labels. Related records open the exact work order in Explorer or Action Center. Missing active states, contacts, specialties, insurance and ratings stay unknown/unavailable/Not rated.

Directory and workload source selectors are independent. Both default to the unchanged fictional fixtures. Use **Import vendor CSV** to attest synthetic/approved redacted evaluation data, select a UTF-8 file, supply vendor account/scope/timezone, map actual headers and active values, choose the specialty separator, then validate/preview/load. Vendor ID is required. No header is assumed to be a verified Rentvine export name. Vendor CSVs never add rows to demo data or replace the separate work-order CSV session. **Clear vendor CSV** clears only the vendor session; reload clears both.

To calculate CSV workload, first load the work-order report in Explorer, then independently load a same-account vendor report. Explicitly confirm that Vendor ID shares the work-order report's identifier namespace. Only exact scoped IDs join; unverified or mismatched sources show Unavailable. A vendor-only CSV still works as a directory without workload. Names/similar names never create joins. Separate report scopes/times and missing/unresolved joins are disclosed.

Profiles offer four editable vendor draft purposes: status update, appointment inquiry, estimate request and aging follow-up. Choose a verified active assignment, edit and copy. Aging drafts require the configured age threshold. Edits are local to the open profile and discarded on close/source change. Nothing is sent, dialed, uploaded or stored in the browser. Real operational contact access still requires server authorization, privacy review and protected storage; this phase permits synthetic/redacted evaluation only.

Historical Phase 4 review scope: [PHASE4_REVIEW.md](PHASE4_REVIEW.md). Properties and Analytics were placeholders at that release. No merge, live Rentvine integration or public deployment is included.


## Phase 5 · Properties & Analytics
**Properties** shows every supplied property, including zero matching work orders, plus a separate Unknown relationship group. Search names/IDs/supplied addresses, filter work-order cohorts or review signals/workload, sort and paginate. Profiles show scoped metrics, category observations, supplied vendor associations, available dates and complete current-report history. Any retained comparable prior property rows are separate evidence: missing current rows are never inferred closed or added to current KPI totals. Exact current records open in Explorer. No addresses or source service history are invented.

**Analytics** uses the same selected work-order source as Explorer/Action Center, with independent property/vendor/category and creation/completion-cohort date filters. KPI and chart counts open exact supporting records. Actual creation/completion dates supply observed monthly event counts; aging/category/property/vendor/approval/assignment breakdowns include unknowns explicitly. Mean/median completion durations have calendar/elapsed cohorts, samples and exclusions. Comparisons use the same scoped records and disclose limitations. Historical backlog is Unavailable without a compatible retained pair; with one, only the two actual import observations appear. Financial analytics remain Unavailable.

Properties/Analytics source controls also select the independent vendor directory where relevant. CSV vendor names/comparisons require confirmed identifier namespace and matching account/source mode. CSV records never merge into demo data. Overview remains the original independent demo. Changing datasets resets source-bound filters/details; navigation within a source preserves page contexts.

**Review thresholds** configures proposed property volume/aging/approval/unassigned/repeated-category counts. Repeated classifications do not prove recurring defects; these are not property risk ratings. The existing **Demo rules** still controls aging and core eligibility. **Vendors → Scorecard settings** configures visible measurements and the minimum eligible completion sample, independent of existing vendor metrics. Missing ratings show Not rated; appointment timeliness and numerical quality scores remain unavailable. Everything resets on reload.

Follow-up eligibility/order is unchanged. Recommendations now distinguish pending owner decisions, vendor assignments and unknown coverage; supplied completion-date/active-status conflicts prompt verification rather than claims of closure. Editable vendor drafts reference only available facts and remain copy-only. Future financial reader types are defined without enabling cost ingestion, financial APIs, accounting privileges or fabricated spending.

See [PHASE5_REVIEW.md](PHASE5_REVIEW.md) for review scope, validation and Phase 6 prerequisites. No merge, live Rentvine connection or public deployment is included.

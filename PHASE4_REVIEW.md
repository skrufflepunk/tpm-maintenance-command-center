# Phase 4 · Vendor Watch & performance management

Branch: `feat/phase-4-vendor-watch`, based on completed Phase 3 commit `64b2f51`.

## Result
Vendors now opens a working desktop-first Vendor Watch workspace while retaining the six-tab navy sidebar, original tropical artwork, compact header, Overview, Explorer and Action Center. The existing fictional fixture has not been expanded or modified.

- Five source-qualified KPIs: directory vendors, explicit active vendors, vendors with known active assignments, assigned work orders above the configured age threshold, and distinct vendors with follow-ups. Vendor/work-order units and missing evidence are visible. Cards and queue follow directory filters.
- Directory search, specialty/status/workload/follow-up filters, typed stable sorting, pagination, clear/reset and useful empty/unavailable states.
- Profiles with supplied IDs/type/specialties/status/contact/state/insurance fields, current/completed/aged/all report records, workload by maintenance category, completion means with precision/sample/exclusion labels, field coverage and provenance.
- A deduplicated multi-reason vendor follow-up queue using the existing Action Center predicates and precedence. Direct navigation opens the exact scoped work order in Explorer or Action Center without changing its selected source or filters.
- Four editable copy-only vendor draft purposes: status, appointment inquiry, estimate and aging. Purpose/work-order edits are retained only inside an open profile, then discarded on close/source change. Clipboard success/denial and restore behavior are explicit. No messages are sent.

## Data and adapter boundaries
`VendorCsvSession` is a separate bounded in-memory adapter. Actual headers are mapped explicitly; illustrative Rentvine headers are not treated as a verified schema. Vendor ID, account, scope, timezone and evaluation attestation are required. Active-value mappings and specialty delimiters are reviewed; vendor type and work-order categories never imply specialties.

Preview validation rejects structural errors, duplicate/blank IDs, absent/reused mappings and invalid provenance. Invalid optional date/contact fields remain unavailable with coverage/warnings. Failed/stale candidates retain the last successful directory; replay is idempotent and returned/staged objects are defensive copies. Comparable prior vendor IDs support missing-since-prior evidence without inventing inactive/deleted records.

Vendor and work-order selections/provenance are independent. A verified relationship requires matching source mode/account and explicit confirmation that Vendor ID shares the work-order namespace. Only identical scoped IDs join. Unverified/incompatible joins produce unavailable workload; unmatched references do not create vendors or imply unassignment. CSVs never merge with demo data or rewrite original work-order snapshots/comparisons. API adapters can supply the same normalized directory contract later; no endpoint/authentication scheme is invented.

Contact fields are evaluation-only text and are not send/dial links. No browser storage, server upload, private operational contacts, source writes, API keys, live Rentvine, merge or public deployment is introduced. All eight source-of-truth documents describe the Phase 4 contracts and limitations.

## Verification
Production build/TypeScript and ESLint passed. All **87 unit/domain/data tests** passed (18 new Phase 4 cases). All **80 desktop browser checks** passed: 20 each in Chrome at 1366/1440/1920px and Edge at 1440px, including 24 new Phase 4 checks. Coverage includes directory filters/sort/counts, specialty evidence, active/completed/unknown cohorts, completion precision/invalid pairs, aging boundaries, verified joins, CSV rollback/staleness/replay/isolation, details, exact-record navigation, draft edit/copy/denial/discard, pagination, WCAG scans, previous phases and local iframe behavior.

Desktop review screenshots (fictional data only) are outside the checkout:

- `/workspace/artifacts/tpm-phase4-vendor-watch.png` — full workspace and queue.
- `/workspace/artifacts/tpm-phase4-vendor-watch-viewport.png` — 1440×1000 viewport.
- `/workspace/artifacts/tpm-phase4-vendor-profile.png` — profile/evidence.
- `/workspace/artifacts/tpm-phase4-vendor-draft.png` — appointment inquiry template.

No app dependencies were added. A temporary formatter was used without changing the package manifest/lockfile. A credential-pattern scan passed over source, tests and the production bundle; this is not a complete security audit.

## Remaining limitations
- Existing demo active states are all unknown, so its Active vendors KPI is Unavailable. No contacts, insurance dates, assignment timestamps or ratings were added to make the demo appear complete.
- Aging measures time from work-order creation, not time since assignment. Appointments, response times, commitments, service quality and full source activity history remain unavailable. Ratings show Not rated, and no quality ranking is calculated.
- Completion and workload statistics describe only linked records in the selected work-order report; they are not vendor lifetime performance or proof of directory/portfolio completeness. Mixed date precision is not combined into a single mean.
- Vendor freshness policy is unconfigured. Source report time and actual receipt time remain distinct. A missing row is not a source deletion or closure.
- This is synthetic/redacted local evaluation. Server authorization/contact roles, protected storage/retention, production Google Sites authentication/framing and live integration remain future work. Local iframe tests cover layout and interaction only.
- Properties and Analytics remain explicitly labeled future placeholders. No dedicated mobile development/screenshots were requested or introduced.

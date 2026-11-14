# Phase 5 · Properties, Analytics and targeted improvements

Branch: `feat/phase-5-properties-analytics`, based on completed Phase 4 `61ec049`.

## Completed work
All six sidebar destinations are implemented. The TPM navy/sidebar layout, original mountain/palm artwork and existing Phase 1–4 interactions remain in place. The original fictional fixture is unchanged; no property addresses, operational records, ratings, timestamps or financial values were added to it.

**Properties** provides a searchable/filterable/sortable/paginated directory, scoped backlog/completion/aging/approval/assignment/duration metrics, zero-workload supplied entities, a separate Unknown relationship group and configurable operational review signals. Profiles distinguish scoped statistics from all available current-report records, show actual category/vendor/date evidence, and expose retained prior property observations separately. Missing current records remain marked unavailable without a false current-record action or an inferred closure. Exact current work orders open in Explorer.

**Analytics** provides current-backlog and completion/mean/median/approval KPI drill-downs; interactive created/completed monthly event bars with a data table; aging/category/property/vendor/approval/assignment breakdowns; precision-specific duration evidence; searchable/sortable/paginated property/vendor comparisons; and at most the two actual retained comparable import observations. Chart/KPI drill-downs expose exact supporting records and Explorer navigation. Missing history and maintenance costs have explicit Unavailable states.

**Earlier phases** gain a configurable Vendor Watch evidence scorecard, visible measurement choices and an independent completion sample gate. Existing vendor metrics and core rule settings remain unchanged. No numerical quality formula is implemented; appointment data is unavailable and ratings are Not rated. Action Center/Vendor Watch recommendations and copy-only vendor templates now distinguish confirmed assignment, pending owner decisions, unknown coverage and valid supplied completion-date/active-status conflicts. Queue eligibility, precedence and counts do not change. Unresolved vendor references remain opaque intact identifiers, never decoded/shortened into an assumed source ID.

**Future costs** have unimplemented typed reader/models for explicit-currency decimal strings, source-qualified records/provenance, separate cost kinds and source transaction identities. No financial CSV mapping, financial aggregation, accounting permission, API call or amount is enabled.

## Source and calculation boundaries
Properties/Analytics use the same selected work-order snapshot as Explorer and Action Center, with independent explicitly labeled page filters. Overview retains its independent demo. The vendor directory has separate provenance and selection; names and comparisons require verified scoped IDs, matching source mode/account and confirmed identifier semantics. Unrelated directory rows never enter CSV comparison metrics. Page-wide notices acknowledge a selected vendor CSV even when work orders are demo.

Date filters explicitly select a created-date or completed-date record cohort. Each monthly series additionally clips its own actual supplied event date to the window and report reference. No empty months or historical backlog curve are synthesized. Means/medians separate calendar-date and elapsed timestamp cohorts, retain sample/exclusion counts and show Unavailable for unsupported combined statistics. Repeated categories describe distinct work-order classifications, not proven recurring defects. Count-based property flags are configurable operational review thresholds, not risk scores.

All eight source-of-truth documents describe the new contracts, defaults and limits. No app dependency or package manifest/lockfile change was needed. A temporary formatter was used outside the project dependency set. Screenshots use only the unchanged fictional demo and are saved outside Git.

## Validation
Production build/TypeScript and ESLint passed. All **106 unit/domain/data tests** passed (19 new Phase 5 cases). The complete **108-browser-check matrix** passed: 27 each in Chrome at 1366/1440/1920px and Edge at 1440px. After the final opaque-reference display guard, the 28 Phase 5 browser checks were rerun across the same four targets and passed. Added coverage includes property grouping/zero rows/unknown relationships, filter reconciliation, signal thresholds, date cohorts and boundaries, actual-event series, completion precision/median exclusions, compatible observed-load history, scorecard sample/measurement settings, contextual recommendations, opaque vendor identifiers, exact navigation, CSV rollback/source isolation, retained missing-row evidence, pagination, keyboard/modals, WCAG scans and desktop/iframe layout. Existing Phase 1–4 suites are retained.

Desktop review artifacts:

- `/workspace/artifacts/tpm-phase5-properties.png` — full Properties workspace.
- `/workspace/artifacts/tpm-phase5-properties-viewport.png` — 1440×1000 viewport.
- `/workspace/artifacts/tpm-phase5-property-profile.png` — source-qualified profile.
- `/workspace/artifacts/tpm-phase5-analytics.png` — full Analytics workspace.
- `/workspace/artifacts/tpm-phase5-analytics-viewport.png` — 1440×1000 viewport.

A credential-pattern scan covers source, tests and the production bundle. This is not a full security audit. No dedicated mobile work/screenshots, merge or deployment is included.

## Known limits and data still needed
- Reports may be partial; counts and durations are observed cohorts, not vendor/property lifetime performance or portfolio completeness. Addresses, unit/occupancy normalization and complete source activity history are unavailable. CSV properties remain inferred from supplied stable IDs.
- Only current and one compatible previous CSV observation are retained. Old/missing property rows are separate evidence and never silently restored into current totals. First/incompatible/demo histories remain Unavailable.
- Assignment timestamps, appointment events, approval-request dates and verified rating/count/scale data are absent. Work-order age does not establish response time, lateness or missed visits. A completion date on active status is a field conflict for review, not proof of completed work/closure.
- Quality scoring has no approved methodology. Financial fields/mappings and transaction semantics are unverified and inactive. Cost analytics remain Unavailable; no fabricated spending or zero-as-missing substitution exists.
- Source selections, imports, review settings and drafts remain memory-only evaluation state. Real operational data, contact-role authorization, private retention/storage and production access controls are not enabled.
- Local 1060×620 iframe tests establish layout/interaction only. Actual protected Google Sites identity, cookies, sessions and framing remain unverified.

## Phase 6 prerequisites
1. Review sanitized actual exports and current official read-only API documentation: native IDs/relationships, account scopes, coverage, status/priority mappings, timezone, pagination, quotas and freshness. Do not invent endpoints or permissions.
2. Implement server authentication/authorization for direct and embedded access, viewer/importer/admin roles, contact-field access rules and server-only secret management. Verify anonymous and unauthorized requests are denied independently of Google Sites.
3. Build least-privilege read-only synchronization adapters behind the existing normalized snapshot/directory contracts, with bounded retries/rate limits, atomic validation, last-successful-data retention and honest failure/freshness reporting. Obtain approved synchronization cadence before scheduling.
4. Establish protected persistence, history/retention/cleanup, importer authorization and safe audit logging. Confirm redaction and approved handling of summaries/vendor contacts; keep private records and credentials out of Git/client artifacts.
5. Validate the real Google Sites portal's ancestor origins, CSP/framing, authentication redirects, third-party-cookie restrictions, expiry/logout/revocation and direct-access protection. Keep production origin restrictions exact and fail closed.
6. Add appointment/ratings/financial capabilities only after source fields, scopes, validation and access are reviewed. Financial work also needs currency/precision, transaction identity and double-counting rules. Any numerical quality methodology requires separate documented approval.

No live Rentvine connection, source write, message sending, public deployment or main-branch merge is part of Phase 5.

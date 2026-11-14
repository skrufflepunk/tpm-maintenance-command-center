# Features and acceptance criteria

## Phase 7 integration readiness

The existing features remain; Data & Settings is split into Data Sources, Imports & History, Automation, Security & Settings, with keyboard tabs, restorable section links, preserved drafts between sections and honest latest successful CSV-load time. Imports/history/validation/source policies/retention/audit/admin controls remain available under their relevant section. API and automatic delivery remain disabled by default.

Unauthorized root access shows a data-free gate; app assets and maintenance APIs still deny anonymous requests. Framed authorization routes show instructions to sign in in a new tab; successful sign-in can be followed by a frame reload. Signed-in frames offer an authenticated-tab fallback. Dashboard logout shows a signed-out gate without immediately restarting SSO. These are access screens for the existing dashboard, not a second portal.

Prepared Google Workspace mode adds signed exact hosted-domain and verified-email checks to explicit immutable-subject roles. Role access remains server-enforced. Production configuration, actual Google provider/portal verification and final go-ahead remain required. The non-root container/runtime controls and operator encrypted-backup tool are prepared for reviewed hosting; no service is published. See PHASE7_REVIEW.md.

## Current Phase 6 behavior

All six existing workspaces consume the same selected Demo/CSV work-order source; Overview no longer remains an independent demo after CSV selection. Vendor/property catalogs keep dataset provenance and only join on verified same-account scoped identifiers. Fictional and operational records never mix. Each page retains its existing independently labeled filters, drills, rules and copy-only templates.

Data & Settings is a sidebar utility outside the six main tabs. It offers Demo/CSV selection, disabled API mode, source approval and snapshot/upsert configuration, three separate report mappings/previews, validation failures/duplicates, import history, data-health counts/as-of/load/check times and configurable rule/review/freshness/retention policies. Receipt/audit display uses Mexico City; source-date calculations keep their declared timezone. Missing fields/statuses remain unknown, and vendor-only/property-only CSV workspaces show no imported work orders rather than borrowing demo records.

With authenticated server configuration, administrator operations persist approved records, original mapped source values and safe audit history in encrypted storage. Viewer imports/configuration/audit are forbidden server-side and vendor email/phone are withheld. Signed-out operational access is denied. Local synthetic/redacted evaluation remains memory-only. Import previews are bounded, actor-bound, expiring and revision-checked; failures preserve the last successful dataset. Identical imports do not create duplicate records or artificial comparison history. Full snapshots archive absent rows; incremental updates disclose retained last-known rows without inferring closure or response.

Optional authorized filesystem processing requires operator and administrator gates, reviewed saved mappings and an explicit interval. It does not request or generate reports from Rentvine. API mode remains Not configured with secure server setup instructions: no credential form, enable bypass, fabricated endpoint or live connection. Existing recommendations stay rules-based; messages stay editable and copy-only.

See [verification status](docs/VERIFICATION_STATUS.md) for implemented/configuration-required/blocked/planned distinctions. Earlier phase sections below preserve release history; their independent Overview/vendor or session-only statements are superseded by Phase 6.

## Shared behavior
All six tabs consume the same normalized snapshot and business-rule functions. Display demo/CSV/API mode, report-as-of and import time, scope, and quality warnings. Shared filters are property, mapped status, vendor (including Unknown), category, priority, created-date range, and aging bucket where applicable. Combine filters with AND; selections within one filter use OR. Text search is case-insensitive over work-order number, redacted summary, and property label. Use explicit “Unknown” selections. Detail navigation preserves filters; Clear all resets them. Unsupported filters show an explanation rather than silently doing nothing.

Filters apply to work-order-derived cards, queues, and charts across tabs. Vendor directory search/category/active controls are independent of work-order filters and labeled accordingly; selected work-order filters affect only its linked workload panel. Property directory includes known properties even with zero matching work orders, showing counts scoped to filters. Analytics date controls explicitly identify creation or completion cohort and show active scope. Never label a filtered metric as the entire portfolio.

## Overview
Morning Briefing provides rule-based counts and top follow-ups: aged open work, missing assignments, confirmed pending approvals, changes versus previous comparable snapshot, and data-health issues. Label unknown coverage; a first import says no comparison available. Every count drills into its exact supporting set. Cards include known active backlog, urgent-source-priority count, aging distribution, and pending approvals where supplied. No invented AI narrative or live-data claim.

Acceptance: card and queue counts agree under identical filters; partial status coverage is disclosed; the briefing remains usable with no previous snapshot and no vendor file.

## Work Orders
Searchable, sortable, paginated register prioritizing work-order number, property, issue, status, vendor, age and next action. The detail view preserves unit if supplied, priority, category, creation/completion dates, approval state, coverage and provenance. “Open in Rentvine” appears only for a verified permitted URL; otherwise explain that the link is unavailable. No edit controls.

Acceptance: sort dates/numbers as typed values, keep unknown values last, stable tie-break by work-order ID, reset page when filters change, preserve a route back from details, and never load an unrestricted source link supplied by untrusted text.

## Action Center
Deterministic follow-up queue: source-reported urgency, confirmed approval pending, aging, missing vendor assignment, and no observed change. Show multiple reasons on one work order. Each reason exposes its evidence and configurable threshold. Missing assignment means vendor coverage exists and assignment is explicitly absent, not that vendor data was omitted. No observed change is not proof of inactivity in Rentvine.

Acceptance: one row per work order, deterministic ordering from BUSINESS_RULES.md, unknown eligibility excluded with counts, no messages or source mutations triggered by viewing a nudge.

## Vendors
Directory with name, specialty/category, known active state, permitted business contact information, and quality indicators. Search and filter controls work with clear-all and empty states. Show assigned active workload from the imported work-order scope, historical completions only when covered, and rating plus review count only when actually supplied. Unrated is not zero-rated. Internal recommendations and editable notes are deferred.

Acceptance: unmatched vendor IDs are flagged; vendor names alone do not cause automatic merges; contact fields are restricted by role; missing ratings never imply poor performance. Vendor completion times describe observed associated records, not causal quality rankings.

## Properties
Property search/list with known active backlog, aged count, unassigned count, and category distribution; drill into matching work orders. Keep unknown property relationships in an “Unknown property” group without inventing addresses. Distinguish property from unit. Counts are scope-qualified when only a work-order report supplies properties.

Acceptance: totals reconcile to the shared set, including unknown relationships; lack of a property master does not imply portfolio completeness.

## Analytics
Creation trends by month, completions by month, known active backlog aging, category mix, vendor workload, and mean/median observed completion duration. Show eligible sample size, exclusions, report scope, timezone, and date basis. Historical backlog curves require retained comparable snapshots; do not reconstruct them from current open records. Never infer costs, response times, or approval durations without the required verified fields.

Acceptance: missing/inverted dates do not enter duration calculations; charts have accessible tabular equivalents; a single snapshot never claims change history or past backlog.

## Import and Data Health
Authorized import flow: choose dataset, confirm report scope/as-of/timezone, map columns, preview redacted records and validation summary, then commit a valid candidate atomically. Invalid imports retain the previous successful snapshot and show the failed attempt. Separately imported vendors and work orders retain separate provenance and timestamps. Data Health shows rejected rows, unmatched joins, duplicate IDs, missing fields, comparison compatibility, and stale source coverage.

Acceptance: duplicate file import is idempotent; errors are actionable without PII dumps; report disappearance is flagged, not closed/deleted; sample mode never mixes with operational data; latest failed attempt does not overwrite successful-import time.

## Release validation
Use synthetic fixtures for missing dates/statuses/vendors, duplicates, invalid dates, partial reports, absent prior snapshots, failed import, stale data, empty results, authorization failure, and narrow-screen layouts. Demonstrate working filters and every visible action. Verify anonymous requests fail for both app data and backend routes outside Google Sites.

## Phase 2 delivery scope
Work Order Explorer replaces the Work Orders placeholder while retaining the six main navigation names. All register columns sort, unknown values remain last in either direction, ties use stable IDs, pagination resets on filter/sort/page-size/source changes, and the page supplies explicit empty states. Date filters use creation dates. Summary counts reconcile to the filtered dataset. Pending approval highlights reflect explicit pending state rather than an assumed waiting interval. Age highlights use the configured proposed calendar-day threshold and exclude unknown ages/statuses.

Record details show all available normalized allowlisted fields, original source status/priority, coverage, provenance and supplied dates. Compatible CSV loads can show observed changes; missing history is labeled unavailable. The import flow requires redacted/synthetic evaluation confirmation, source scope/timezone, exact column mappings, reviewed enums, validation and a normalized preview before loading. Invalid candidates preserve the last successful CSV state. Source switching resets Explorer scope; it never mixes data or changes Overview's independent demo filters/data. CSV session clearing is local only and has no source-system effect.

## Phase 2 final usability refinements
Explorer's primary table presents seven priority columns; detailed approval, priority, category and dates remain available in each record's detail view and via the metadata sort selector. Open Work Orders, configured aging, Pending Approval and Unassigned KPI buttons apply the existing predicates to the register; all matching records resets only the KPI predicate. Counts are based on the ordinary filter context, so switching KPI predicates does not accidentally intersect the previous quick filter. Other filters remain applied; reset KPI filter preserves that context, while Clear Explorer filters resets all filters and pagination. Missing or unknown assignment/approval/status/age data is never treated as confirmed eligibility.

The sidebar is the sole primary navigation. Prepare Open in Rentvine in record details, disabled with a reason unless a source URL passes the verified exact-origin HTTPS policy. No URL construction, live API, source mutation, or credential flow is enabled. The later user request authorizes Phase 3 Action Center delivery.

## Phase 3 implemented behavior
Action Center applies source-qualified search/property/status/vendor/priority/approval/category filters before eligibility calculations. Five KPI buttons select all eligible follow-ups, configured aging, explicit pending approval, explicit unassignment, or an unavailable scheduled-review state. KPI and Morning Briefing counts use the same deduplicated ActionItem set as the queue. Briefing groups may overlap; queue rows never duplicate a scoped work-order ID. Scheduled reviews are Unavailable, not zero. Other follow-ups require comparable observations; missing evidence is disclosed.

Default ordering reuses configured source-urgent → pending → aging → unassigned precedence, then appends eligible no-observed-change cases. Known age sorts descending with stable ID ties. Users can sort/filter/paginate, inspect all reasons and their facts, and open the exact record in Explorer without relying on text search or changing source. Recommendations are suggestions for staff to verify and act on in Rentvine, never source writes or allegations of a missed appointment/nonresponse.

Record panels include editable owner/tenant/vendor drafts. Recipient selection preserves each recipient's edits while the panel stays open. Restore template is explicit; Copy draft copies only the currently edited text and reports success/failure. Clipboard denial provides manual-copy guidance. Closing the panel or changing source discards drafts. There are no recipient addresses, messages sent, AI responses, background tasks or contact storage.

## Phase 4 implemented Vendor Watch behavior
Vendor directory controls are independent of Explorer and Overview filters. Search includes supplied name, ID, type, specialties, business contacts and state; specialty/status/workload/follow-up filters combine with AND. Filtered directory cards, rows and linked follow-ups reconcile. Unknown active state is distinct from inactive; an entirely unknown active-state cohort displays Unavailable. Directory sorting supports name, ID, type, active status, assigned/open/completed counts, observed mean duration and follow-up counts, with unknowns last and stable ID ties. Pagination resets when filters or sorting change.

Profiles show mapped contact/specialty/type/active/state/insurance fields or explicit missing states, current/completed/aged/all report records, category workload, date-precision-qualified duration statistics and source provenance. Work-order categories never create vendor specialties. Related records open their exact scoped identity in Explorer or Action Center without changing its source or filters. Follow-ups use the same Action Center eligibility and precedence; reasons are not evidence of vendor fault. Assignment duration remains unavailable.

Vendor drafts offer status update, appointment inquiry, estimate request and aging follow-up. Aging drafts require the configured active-age predicate. Each work-order/purpose pair retains edits only while the profile is open. Restore and clipboard success/denial work explicitly. Closing/changing dataset discards edits; there is no sending.

Vendor import uses the actual uploaded headers with no auto-mapping, a stable Vendor ID, account/scope/timezone, optional offset report time, explicit active-value mapping and specialty separator, synthetic/redacted attestation and optional verified-ID-namespace confirmation. Validation failures preserve the previous directory. Files and sources never merge with demo records. Unmatched references and missing-since-prior counts are disclosed, not treated as unassigned/inactive/deleted. Reload clears both evaluation sessions. Operational authorization/contact roles are not implemented.

## Phase 5 implemented behavior
Properties and Analytics share the selected work-order source with Explorer/Action Center. Their property/vendor/category/date controls are independent page scopes. Date limits explicitly select a created-date or completed-date record cohort, with AND semantics; missing/invalid dates are excluded only when limits exist, and completed-date ranges require explicit completed status. Source selection/replacement resets source-bound filters, profiles and drill-downs. Vendor directory provenance remains separate, and its labels/metrics require the existing verified relationship.

Property directory search includes supplied name/ID/address. Sorts cover all requested workload counts and observed mean duration with unknown means last. Supplied properties remain present at zero under work-order filters; explicit directory search/signal/workload filters can hide them. Unresolved or cross-account property references form Unknown property, without invented entities/addresses. Profiles show scoped metrics/categories/review signals, all current report records independently of directory filters, supplied vendor associations and available dates. Retained previous compatible property records are separate evidence; vanished rows never enter current totals or receive an inferred status. Current records navigate by exact scoped ID to Explorer; vanished records have no false current-record action.

Operational summaries expose configurable volume/aging/approval/unassigned/repeated-category counts. A repeated known category on distinct source work-order IDs is a repeated classification observation, not proof of recurring defects or service events. No per-unit/occupancy normalization or risk score is available.

Analytics charts include created/completed monthly event counts, current known-active backlog, aging, categories, properties including unknown relationships, vendor IDs/assignment states, owner approval and vendor assignment coverage. Every count opens its exact supporting record set with pagination/Explorer navigation; charts expose labeled text and the monthly series also has a data table. All metrics and comparisons use the selected record cohort. Each event series additionally applies the date window to its own supplied event date; no missing months are synthesized. Mean/median separate calendar and elapsed precision with sample sizes/exclusions. Historical backlog shows only retained compatible actual load observations; first/incompatible/demo history is Unavailable.

Property and vendor comparison tables support search, metric sorting and pagination, show equal filter scope/sample evidence and never rank service quality. Incompatible vendor directories show Unavailable, not demo rows mixed into CSV comparisons. Vendor Watch's scorecard has independently configurable visible measurements and a minimum eligible completion sample. Ratings remain Not rated, appointment timeliness remains unavailable, and no numerical quality methodology is approved or enabled.

Follow-up eligibility/counts/order are unchanged. Aging/no-observed-change recommendations distinguish a pending owner decision, confirmed assignment, explicit unassignment and missing assignment coverage. A supplied nonfuture completion date on an active record prompts verification, never a claim that completion or closure occurred. Copy-only vendor templates can reference that field conflict and explicit pending approvals; existing edit/copy/restore/discard behavior remains intact. Financial analytics are Unavailable until an approved source contract/mapping and access exist.

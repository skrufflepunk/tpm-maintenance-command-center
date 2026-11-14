# Features and acceptance criteria

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

The sidebar is the sole primary navigation. Prepare Open in Rentvine in record details, disabled with a reason unless a source URL passes the verified exact-origin HTTPS policy. No URL construction, live API, source mutation, or credential flow is enabled. Phase 3 requires user approval after this refinement pass.

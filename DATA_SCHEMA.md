# Normalized data schema

## Contract conventions
These are application contracts, not claims about Rentvine field names. Map actual export headers explicitly and version the mappings. IDs are opaque strings; scope every ID to a source account. Use source stable IDs where verified; work-order number is a candidate key only after uniqueness is confirmed within account/report scope. Do not merge by name/address alone. Required internal keys must be present for accepted rows; optional source values are null when unavailable. Preserve raw statuses in controlled storage; do not store arbitrary raw rows in client state or logs.

Dates with offsets normalize to UTC instants; source date-only values remain YYYY-MM-DD plus declared source timezone and precision. Do not invent times. Money, if added later, requires currency and decimal-safe representation. Unknown boolean values are null, not false.

## Entities
| Entity | Fields and meaning |
|---|---|
| WorkOrder | id (internal scoped key), sourceAccountId, sourceId, number, propertyId?, unitLabel?, summaryRedacted?, sourceStatus?, status, sourcePriority?, priority, categoryId?, vendorId?, vendorAssignmentState, approvalState, createdAt?, completedAt?, sourceUpdatedAt?, sourceUrl?, fieldCoverage, provenance |
| Property | id, sourceAccountId, sourceId, displayName?, permittedAddress?, coverageKind (master or inferred), provenance |
| Vendor | id, sourceAccountId, sourceId, displayName?, categories[], active (boolean/null), businessPhone?, businessEmail?, ratingAverage?, ratingCount?, ratingScale?, provenance |
| Category | id, label, sourceValue?, provenance |
| Snapshot | id, sourceMode (demo/csv/api), schemaVersion, mappingVersion, rulesVersion, importedAt, datasets[], workOrders[], properties[], vendors[], categories[], qualitySummary |
| DatasetProvenance | datasetType, sourceAccountId, fileDigest?, reportAsOf?, receivedAt?, importedAt, sourceTimezone?, reportScope, coverageFields[], mappingVersion, completeness (complete/partial/unknown), rowCounts |
| ImportAttempt | id, startedAt, finishedAt?, datasetType, outcome (preview/accepted/rejected), previousSnapshotId?, candidateDigest?, errorCodes[], acceptedCount, rejectedCount, actorId |
| ObservedChange | id, previousSnapshotId, currentSnapshotId, workOrderId, field, previousValue?, currentValue?, detectedAt, sourceEventAt? |
| QualityIssue | code, entityType, entityId?, field?, severity, safeMessage; no sensitive raw row payload |

Question marks indicate nullable or unavailable fields. Internal IDs and snapshot metadata are generated, not invented source facts. Expose only fields authorized for the viewer. Field coverage distinguishes column unavailable, value missing, explicitly absent, invalid, and present.

## Enumerations
- status: open, in_progress, on_hold, completed, cancelled, unknown. Explicit reviewed mapping from source statuses; pending approval is a separate state.
- priority: urgent, high, normal, low, unknown. Source mapping only; age never creates “urgent.”
- vendorAssignmentState: assigned, unassigned, unknown. Unavailable assignment column yields unknown.
- approvalState: pending, approved, not_required, unknown. Never infer pending from free text or an empty approval field.
- reportScope: structured metadata including included statuses, date range and basis, property/account scope, export filters, and comparisonKey. Record unknown scope explicitly.

## Import contract
1. Parse CSV safely with quoted delimiters/newlines, BOM and encoding handling, size/row limits, and explicit date formats. Treat cells as data; never execute formulas. If exporting later, neutralize spreadsheet formula injection.
2. Map and validate required keys; reject the candidate import for missing key mappings, ambiguous duplicate keys, unsafe scope/account mismatch, or structural parse errors. Invalid optional fields become null with issues. Proposed row-level rejection is allowed only when user sees counts and confirms partial coverage; structural/duplicate-key failures cannot be bypassed as a partial import.
3. Preserve source values needed for audited mapping in restricted storage; send only normalized allowlisted fields to clients. Apply tenant redaction before previews/persistence.
4. Join by scoped IDs. An unmatched reference remains unresolved with its source ID; do not fabricate vendor/property records with guessed attributes. Inferred property entries require a reliable property ID and explicit inferred coverage.
5. Stage, preview, and atomically commit to the authorized dataset. Digest plus account/dataset/scope identifies repeated input; no duplicate changes on replay.
6. Retain current and previous comparable snapshots for changes. An unchanged payload may update successful-check metadata but never fabricate field changes or source timestamps.

## Comparability and removals
Compare only matching account, dataset, report scope, and compatible schema/mapping semantics. An imported vendor directory alone is not a work-order comparison. Missing rows are “not observed in latest report,” retained separately from the latest observed set; they are not automatically completed or deleted. Metrics use latest observed records and show missing-since-prior counts separately. Older retained records must not silently enter current totals. A status mapping change requires re-normalization or a new comparison baseline.

## Privacy and history
Tenant names, phone/email, entry/access codes, payment details, free-form notes, and attachments are excluded by default. Summaries may contain PII: allowlist/redact or omit. Vendor business contacts are still internal restricted information. Retention periods, deletion process, and shared snapshot persistence must be approved before operational deployment; do not retain indefinitely by default. Never commit real CSVs or snapshots to GitHub.

## Implemented CSV evaluation contract
No verified Rentvine export headers are available in this repository. Explorer presents actual uploaded headers for explicit mapping to these application fields: sourceId, number, propertyId, propertyName, summaryRedacted, status, priority, category, vendorId, vendorAssignmentState, approvalState, createdAt, completedAt, sourceUpdatedAt and unitLabel. Only a verified stable sourceId is required; number falls back visibly to that supplied ID. Source account, report scope and timezone are required metadata; source report-as-of is optional and otherwise labeled Unknown with load-time fallback.

Status, priority, assignment and approval values require reviewed mappings; unrecognized/absent values stay Unknown and are disclosed. A supplied vendor ID can establish assigned state, but an empty ID cannot establish unassigned. Conflicting assignment evidence stays Unknown. Vendor IDs remain unresolved without a vendor directory; property entries are inferred only from supplied stable property IDs. Names do not cause joins.

UTF-8 input is limited to 2 MiB, 10,000 data rows, 100 columns and 500 characters per mapped cell. The parser handles BOM, quoted commas, escaped quotes and embedded newlines. Duplicate/blank headers, malformed rows, missing/duplicate stable IDs, conflicting property labels, reused column mappings, incompatible enum mappings and invalid required provenance reject the entire candidate. Dates require YYYY-MM-DD or an ISO timestamp with explicit offset. Invalid optional dates become null with invalid coverage; inverted pairs are excluded from duration metrics. Original date precision is retained. No structural or duplicate failure can be bypassed as a partial import.

The CSV session retains normalized current/previous observations only. Known status/priority/assignment/approval/date changes and coverage changes can be inspected in record details after compatible loads. Missing records remain separate flags, not part of current totals. No source visits, notes, messages, approval dates or activity stream are fabricated. These limits and column choices describe the implemented evaluator, not claims about Rentvine's native schema.

## Phase 3 derived contracts
ActionItem consists of a normalized WorkOrder and multiple ActionRecommendation entries (reason key, title, source/observed fact, recommendation). These are derived UI/domain values and do not add source records or editable work-order fields. Appointment dates/states, approval-request dates, communication history and recipient contact fields have not been invented or mapped.

ObservationPair contains defensive copies of the prior/current compatible CSV snapshots already retained by CsvSession. Action Center uses them conservatively for no-observed-change eligibility and continues to show source activity history as unavailable where not provided. Load/detection timestamps remain distinct from source timestamps. Message drafts are transient plain text keyed by owner/tenant/vendor role within one open detail view, never contact entities or persistent messages.

## Phase 4 vendor evaluation contract
The implemented Vendor contract adds optional nullable `vendorType`, `businessEmail`, `businessPhone`, `state`, `liabilityInsuranceExpiration: SourceDate`, and `fieldCoverage`. `categories` contains explicitly supplied vendor-specialty references, independent of work-order categories. No assignment-date, appointment, service-quality or rating contract is fabricated. Demo vendor fields remain exactly as previously supplied.

Vendor CSV mappings are sourceId (required verified Vendor ID), displayName, vendorType, categories, businessEmail, businessPhone, active, state and liabilityInsuranceExpiration. Rentvine-style header examples are illustrative only: the UI requires selecting actual headers. Multi-specialty cells use a reviewed semicolon, pipe or comma separator; only supplied labels enter specialty options. Active values require explicit mapping to active/inactive/unknown. Missing/invalid optional values remain nullable with coverage/warnings. Insurance dates accept YYYY-MM-DD or offset ISO precision; they do not establish insurance compliance. Contacts are evaluation-only text, not send/dial links.

`VendorDirectory` contains ID, sourceMode, normalized vendors/categories, separate vendor DatasetProvenance and verifiedIdentifiers. CSV IDs use the same encoded account/vendor namespace as the existing work-order adapter. Exact ID joins require explicit confirmation of namespace equivalence plus matching account and source mode; similar names never match. A partial report's unresolved references do not create vendor records. Incompatible joins yield unavailable workload, not zeros. Unknown vendor names are labeled Not recorded rather than fabricated. Stable Vendor ID is mandatory in this evaluator, so no name-based fallback or alias matching is implemented.

Vendor files inherit 2 MiB/10,000 rows/100 columns/500 mapped-cell-character limits and quoted UTF-8 syntax. Duplicate/blank IDs, malformed structure, missing/reused mappings and invalid required provenance reject the candidate atomically. Invalid optional email/phone/date values are excluded with field coverage. Scope/account/mapping semantics gate prior-ID comparisons; missing IDs remain separate evidence, not inferred closures/inactivity. No vendor import changes the work-order snapshot or its history baseline.

## Phase 5 derived contracts and future finance
Property adds optional nullable `permittedAddress`; current adapters/fixtures supply none, so no address is invented or newly imported. PropertyMetrics, insight cohorts, breakdowns, monthly event sets and observed backlog points are derived read-only values, not new property/work-order/history source records. Unknown relationships are aggregate UI groups, not fabricated property entities. ReviewSettings is a separately validated session configuration, not a source field or quality rating. Vendor scorecard values include measurement coverage/sample gates; no numeric quality score, appointment or review fields have been added.

The work-order CSV mapping allowlist is unchanged. Properties/Analytics consume the existing normalized snapshot; they do not assume additional export columns. PriorPropertyEvidence uses only the retained compatible observation pair and labels prior values separately. No old row enters current totals or gains a guessed current state.

`src/data/financialContract.ts` proposes internal future types only: decimal-string VerifiedMoney with explicit currency, MaintenanceCostRecord keyed to scoped account/work-order/property/vendor and a verified source transaction ID, separate kinds for work-order cost/invoice/approved estimate/actual expense, and an ApprovedFinancialSnapshot with reviewed mappings and separate maintenance-cost provenance. These are not verified Rentvine field names or implemented ingestion. Future adapters must validate decimal/currency/date precision, source approval/access and transaction uniqueness, distinguish estimates from actuals, and prevent invoice/expense double counting before any aggregation. No cost fields, amounts, spending periods or financial privileges are currently enabled.

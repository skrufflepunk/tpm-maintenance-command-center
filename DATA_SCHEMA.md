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

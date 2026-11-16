# Phase 2 · Work Order Explorer

Base: latest `feat/overview-polish`, commit `396efb9`. Implementation branch: `feat/phase-2-work-order-explorer`.

The Work Orders placeholder is replaced by a working desktop-first Explorer. Users can search and filter property, status, vendor, maintenance category, priority, owner approval, creation dates and active-age buckets; inspect reconciled KPIs; sort all register columns; paginate; and open read-only details. Missing values remain explicit. Age highlights use the shared proposed threshold. Pending approvals and unassigned vendors require positive source evidence, not guessed waiting times or absent directory entries.

Details expose available normalized source fields, coverage, provenance and supplied dates. Compatible CSV session loads expose observed known-value and coverage changes. Missing rows are flagged separately, never interpreted as closed/deleted. Detection/load timestamps are not source activity timestamps. No events, messages, visits, financial values or vendor ratings are invented.

## CSV workflow

The project contains no verified Rentvine export headers. The importer therefore uses actual uploaded headers and explicit mappings to the documented normalized contract, including reviewed enum mappings. Only synthetic or approved redacted local evaluation files are permitted. Optional mapped issue text must already be redacted; there is no claim of automated privacy redaction.

Parsing and validation handle UTF-8/BOM, quoted commas/newlines, escaped quotes, missing fields, unknown enums, invalid dates and bounded input. Duplicate/missing stable IDs, structural ambiguity, conflicting property labels and invalid provenance block the entire candidate. A normalized preview is mandatory before loading. A valid candidate atomically replaces only the CSV session; invalid/stale candidates preserve its last successful snapshot. Exact file/config replay is idempotent. Only current, previous and staged normalized snapshots are retained in memory.

Explorer's source selector separates demo and CSV records and resets its scope on changes. CSV data persists across in-app navigation but is cleared by reload or explicit session clearing. Overview retains its own demo dataset and filters, and its import shortcut now leads to Explorer. There are no source writes, live API calls, browser database/storage writes, server uploads, merges or deployments.

## Validation

- Production build and strict TypeScript checking passed.
- ESLint passed.
- 49 domain/data tests passed, including CSV syntax/limits, normalization, duplicate rejection, invalid dates, precision-aware sorting, transactional integrity, stale preview rejection, idempotency and comparison eligibility.
- 16 desktop/mobile browser tests passed, covering Explorer, CSV preview/load/rejection, details, filters, pagination, source separation, Overview regressions, keyboard focus and automated accessibility scans.
- Screenshots and viewport-fit checks completed at 1670px desktop, 1024px tablet, 390px mobile and 320px narrow mobile. Screenshot artifacts are outside the checkout in `/workspace/artifacts/`.

## Limits before operational use

This is the documented isolated local evaluation workflow. It does not implement production authentication/importer authorization, private shared storage, approved retention or a verified Rentvine-native schema. No private operational reports should be loaded. Actual sanitized headers and reviewed account-specific mappings are still needed to validate a real export. Approval-request dates, full activity logs and vendor directories are not supplied, so unsupported fields/history/approval durations remain unavailable. The other four main pages remain placeholders.

The subsequent desktop-first refinement pass is documented in [DESKTOP_REFINEMENTS_REVIEW.md](DESKTOP_REFINEMENTS_REVIEW.md). It replaces horizontal shortcuts with sidebar-only navigation, prioritizes seven register columns and adds KPI quick filters without changing CSV isolation or normalized source contracts.

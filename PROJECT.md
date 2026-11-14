# TPM Maintenance Command Center — Project

## Purpose
Provide an internal maintenance command center that helps TPM staff identify follow-ups, understand portfolio health, find vendors, and inspect maintenance trends. Rentvine remains the authoritative system of record. All operational changes happen in Rentvine.

## Confirmed direction
- Build the dashboard first with clearly labeled synthetic fixtures; import actual CSV reports after privacy review; add an optional API adapter only after validating capabilities and permissions.
- Use React, TypeScript (proposed implementation choice), Tailwind CSS, and GitHub for source control. No Supabase dependency is needed for the initial version.
- Use exactly six main tabs: Overview, Work Orders, Action Center, Vendors, Properties, Analytics.
- Preserve TPM navy/blue styling and palm visuals. Approved artwork and exact brand color values still need to be supplied or verified.
- Desktop-first development at 1366–1920px, with Google Sites iframe-aware layout and basic smaller-viewport reflow; no dedicated mobile feature development.
- Read-only Rentvine access. Never create, edit, assign, approve, close, or delete Rentvine records from this application.
- Filters, buttons, navigation, and charts must work. Unknown values stay unknown.

## Delivery sequence
1. Documentation and decisions: agree on schema, mappings, formulas, access requirements, and proposed rule settings.
2. Interface: build all six tabs, shared filters, morning briefing, data-health states, and synthetic fixtures. Label the entire environment “Demo data.”
3. CSV: implement mapping preview, validation, atomic import, vendor joins, reconciliation, and current/previous snapshots. Actual CSV headers and contents must be inspected before finalizing mappings.
4. Optional integration: verify current official Rentvine documentation, least-privilege permissions, field coverage, pagination, quotas, and freshness. Use a server-side adapter; retain CSV fallback. No endpoint or authentication scheme is assumed here.
5. Protected deployment and Google Sites embedding: validate application authentication and authorization directly and in an iframe before allowing operational data.

## Scope
Include morning briefing, aging nudges, missing assignments, approval queues when supported, vendor directory, property summaries, functional filters, report changes, and qualified analytics. Nudges are in-app suggestions; they do not send messages or change source records.

Exclude automatic communications, Rentvine writeback, payments, work-order editing, tenant portals, predictive scores, AI-generated operational claims, and unverified performance rankings. Private Google Sheets/Apps Script ingestion is a possible later alternative, not an initial dependency or a public data feed.

## Completion criteria
All six tabs meet FEATURES.md acceptance criteria; BUSINESS_RULES.md formulas are shared across views; imports and metrics disclose data quality and scope; private data cannot be retrieved anonymously; no secrets are shipped to the browser; approved visual design is preserved. API access is not required to complete the CSV release.

## Decisions still needed
Confirm approved TPM assets, CSV headers and report scope, property/unit identifiers, status and priority mappings, portfolio timezone, authorized staff and access provider, hosting and retention, and approved rule values. Exact source export counts and ratings from the planning conversation were historical observations, not current data or seed content. Screenshots and original reports have not been validated for this package.

## Document authority
PROJECT.md defines scope; DESIGN_SYSTEM.md defines presentation; FEATURES.md defines user behavior; DATA_SCHEMA.md defines normalized contracts; ARCHITECTURE.md defines components and security boundaries; BUSINESS_RULES.md defines calculations and decisions; AGENTS.md governs implementation; README.md explains use. Resolve conflicts explicitly and update affected files together.

## Phase 1 implementation status

The current implementation provides a React/TypeScript/Vite/Tailwind application shell and a functional synthetic-only Overview. Work Orders, Action Center, Vendors, Properties, and Analytics have navigation and explicit placeholders, as requested for Phase 1; the complete release criteria above still apply to later delivery. No operational data, CSV ingestion, API integration, authentication, deployment, or communications are enabled. Branding, timezone and rule defaults remain illustrative pending approval.

## Phase 2 implementation status
Work Orders now opens Work Order Explorer: searchable and sortable source-qualified records, property/status/vendor/category/priority/approval/creation-date/age filters, scoped KPIs, pagination and detailed read-only evidence. Shared rule settings drive aging highlights; explicit approval state drives pending highlights because approval-request dates are not supplied. “Overdue” remains a proposed follow-up threshold, not a verified service-level violation.

CSV preview/validation supports explicit source column and enum mappings against DATA_SCHEMA.md; no actual Rentvine header contract has been supplied. The file must be synthetic or approved redacted evaluation data. Validated CSVs replace only an isolated in-memory CSV snapshot, never demo records. Overview continues using its independent demo dataset. Operational authentication, storage/retention, protected sharing, live integration and the other four pages remain future work.

## Phase 2 final refinement gate
Keep the approved design, with the navy sidebar as the only primary navigation. Prioritize desktop Chrome and Edge, test long-page scrolling at 1366/1440/1920px and size the layout against the iframe viewport, not an assumed full browser window. Explorer now has one heading, seven priority register columns and interactive KPI filters with visible reset. Secondary source metadata remains in record details and the sort selector. CSV remains an isolated evaluation fallback. A source record link stays unavailable until both a reviewed URL and a verified exact HTTPS origin exist. The subsequent user request authorizes Phase 3, as scoped below.

## Phase 3 · Action Center delivery
The Action Center replaces its placeholder with a desktop operations workspace: five eligibility-qualified KPIs, deterministic multi-reason queue, interactive Morning Briefing, record evidence, recommendation text, editable owner/tenant/vendor templates, and navigation to the matching Explorer record. Scheduling remains explicitly unavailable because no verified appointment fields exist. No-observed-change review is conservative and uses only compatible retained CSV observations spanning the configured interval. No source activity or response claims are invented.

Overview remains unchanged in data source. Explorer and Action Center now share a memory-only evaluation workspace and source selector so CSV records never merge with demo records. Drafts are not retained after closing their detail view or changing source. Copying is user-initiated clipboard output only; there is no send integration, contact collection, source mutation or public deployment. Vendors, Properties and Analytics remain placeholders.

## Phase 4 · Vendor Watch delivery
Vendor Watch now provides an independently sourced vendor directory, five scoped KPI cards, search/sort/filter/pagination, evidence-qualified profiles, observed workload/completion metrics, a linked follow-up queue and four copy-only editable vendor templates. The existing three fictional vendors and all Phase 1–3 records remain unchanged. Missing active states, specialties, contacts, insurance dates and ratings are not invented. Properties and Analytics are still placeholders.

A separate session-only vendor CSV adapter supports explicit actual-column/value mapping, preview and atomic replacement. Vendor ID is required; same-account/source-mode joins also require staff confirmation that identifiers share the work-order namespace. Vendor and work-order report scopes/times remain separately visible. A vendor CSV never replaces work orders, modifies demo fixtures or supplies authentication. Real operational contacts, protected sharing/storage, production Google Sites access and live API integration remain future prerequisites.

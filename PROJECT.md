# TPM Maintenance Command Center — Project

## Purpose
Provide an internal maintenance command center that helps TPM staff identify follow-ups, understand portfolio health, find vendors, and inspect maintenance trends. Rentvine remains the authoritative system of record. All operational changes happen in Rentvine.

## Confirmed direction
- Build the dashboard first with clearly labeled synthetic fixtures; import actual CSV reports after privacy review; add an optional API adapter only after validating capabilities and permissions.
- Use React, TypeScript (proposed implementation choice), Tailwind CSS, and GitHub for source control. No Supabase dependency is needed for the initial version.
- Use exactly six main tabs: Overview, Work Orders, Action Center, Vendors, Properties, Analytics.
- Preserve TPM navy/blue styling and palm visuals. Approved artwork and exact brand color values still need to be supplied or verified.
- Desktop-first responsive design, usable on phones and inside Google Sites.
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

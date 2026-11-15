# TPM Maintenance Command Center — Project

## Current release — Phase 8 static edition

The user explicitly authorized a single-user, browser-only edition for $0 GitHub Pages hosting and embedding in the existing Google Site. There is no always-running application backend, sign-in, shared database, API credential or live integration. The six dashboard sections and TPM desktop design remain; manual work-order/vendor/property CSVs use the existing parsers and shared rules, persist locally in bounded IndexedDB and can be exported/restored/cleared.

**GitHub Pages is public; Google Sites restrictions do not protect its URL.** Clean browser profiles start with synthetic demo data. Existing profiles may restore their own local CSV state. No imported data is uploaded by the app; local data/backups are unencrypted and accessible within the same browser profile/origin. A path namespace is not an access boundary. The user accepts these edition differences; do not add fake frontend authentication.

The complete Phase 7 server implementation is preserved unchanged at `1f8a0e1` on `archive/phase-7-server` and `feat/phase-7-sites-readiness`. Current Phase 8 requirements supersede earlier server-only/no-browser-storage rules **only for this static branch**. Older phase sections below describe their historical editions. Deployment remains manual after build/security review; do not merge, change visibility, publish or connect live services automatically. See README.md, docs/DEPLOYMENT.md, docs/GOOGLE_SITES.md and PHASE8_REVIEW.md.

## Historical Phase 7 release

Phase 7 builds on `130f2ad` and prepares controlled private hosting inside the existing restricted Google Sites Team Portal. The Site stays the team's main interface; the dashboard host is a protected embedding service, with an authenticated-tab fallback for browser cookie restrictions. No new portal, public deployment, Google client, live Rentvine connection or automatic ingestion is activated.

Data & Settings now has four accessible sections: Data Sources, Imports & History, Automation, Security & Settings. All prior six workspaces, source isolation, CSV behavior, calculations, roles and settings remain. A data-free access/sign-out gate avoids redirecting identity-provider login inside frames. The prepared Google Workspace profile requires signed hosted-domain/email verification plus the existing explicit subject/role allowlist. A portable non-root Node 24 container, backup tool and VM templates support a later approved deployment.

[Hosting options and planning budgets](docs/HOSTING_OPTIONS.md), [Google Workspace setup](docs/GOOGLE_WORKSPACE.md), [Google Sites steps](docs/GOOGLE_SITES.md), [operator runbook](ops/README.md) and [production/security checklist](docs/PRODUCTION_CHECKLIST.md) define the next controlled steps. Current provider pricing/docs and actual company Google/cookie behavior could not be verified because external documentation destinations are blocked. Obtain approved hosting/region/budget, app origin, Workspace domain/client/staff roles, exact portal ancestors, data/retention policy and recovery ownership before deployment. Do not ask for passwords/secrets in chat. Earlier phases below are release history where superseded.

## Phase 6 baseline

Phases 1–5 are the completed baseline (`a177e1f`). Phase 6 adds a protected CSV operating foundation without requiring Rentvine API approval. **All six sections, including Overview, use the same selected Demo or CSV work-order workspace.** Vendor/property reports retain separate provenance but share that workspace's account and source mode; verified scoped identifiers are required for joins. This supersedes earlier phases' independent Overview/vendor selection behavior described in the historical delivery notes below.

Data & Settings is a separate utility link, preserving exactly six main tabs. Manual work-order, vendor and property CSV mapping/preview/validation works in local synthetic/redacted evaluation and, with the protected server configured, as authenticated administrator imports into encrypted durable storage. Snapshot replacement archives absent rows without inferring closure; incremental upsert retains disclosed last-known rows. Original mapped values, import/audit history, retention and freshness are tracked server-side. Vendor contact fields are restricted to administrators.

The protected Node 24 server implements OIDC staff sign-in, server-side administrator/viewer authorization, CSRF, secure cookies, encrypted SQLite storage and deny-by-default framing. Actual identity/hosting/storage/retention/report permissions must be configured and approved before operational use. Local browser tests use a synthetic identity provider and synthetic reports only. Optional private filesystem ingestion processes already-delivered reports only when both operator and administrator gates are enabled; it does not generate Rentvine reports.

Rentvine API mode is disabled. Public documentation retrieval was blocked in this environment; endpoints, authentication, native fields, pagination, quotas and read scopes remain unverified. A typed server-only interface explicitly rejects activation; no live credentials or requests are used. Real hosting/Google Sites authentication and cookie compatibility are unverified. See [Phase 6 review](PHASE6_REVIEW.md) and [verification status](docs/VERIFICATION_STATUS.md) for implementation versus external prerequisites. No merge or public deployment is authorized.

The phase sections below document delivery history; current Phase 6 requirements take precedence where source selection or persistence changed.

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

## Phase 5 · Properties, Analytics and targeted improvements
All six navigation destinations now have working read-only workspaces. Properties and Analytics consume the same selected demo/CSV work-order snapshot as Explorer and Action Center, with independent page filter contexts. Overview retains its verified independent demo behavior. Vendor names and comparisons use only the selected directory under the existing verified account/source/identifier rules; unrelated vendor sources cannot supply joined names or comparison metrics.

Properties retains supplied entities with zero matching work orders, groups unresolved relationships separately, and exposes search/sort/filter/pagination, scoped metrics, configurable count-based review signals and complete available report evidence. Analytics provides interactive actual-event/aging/category/property/vendor/approval/assignment charts, precision-qualified duration cohorts, comparisons and at most the two retained comparable load observations. No historical portfolio curve, financial metric or quality rating is manufactured.

Vendor Watch adds a configurable evidence scorecard with an explicit completion sample gate and unavailable appointment/ratings/quality-score states. Existing vendor metrics remain unchanged. Follow-up wording now considers positive assignment/approval evidence and supplied completion-date/active-status conflicts without changing queue eligibility, precedence or thresholds. Financial reader/model types are future internal contracts only; no financial mapping, credentials, permissions or API is enabled.

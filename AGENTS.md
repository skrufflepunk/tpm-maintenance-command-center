# Instructions for coding agents

## Current Phase 8 user authorization (takes precedence for this branch)
The user explicitly requested a free, single-user GitHub Pages static edition with local CSV imports, browser persistence, export/restore and clear controls. This supersedes earlier server-only/no-browser-storage/no-anonymous-access rules **for this static branch only**. Preserve the unchanged Phase 7 server at `1f8a0e1` on `archive/phase-7-server` and `feat/phase-7-sites-readiness`. Do not reapply server authentication, require a paid/always-on backend or invent frontend access control.

Preserve all six dashboard layouts/filters/charts/domain rules and source isolation. Persist only approved mapped columns under documented limits; validate local state/backups by re-running CSV parsers; keep prior evidence separate from current totals. Show storage failures/temporary mode honestly, protect failed-write rollback and stale-tab clears. Local data/backups are unencrypted, and same-origin siblings share origin storage; path names are not security boundaries. Never publish imported records, backups, credentials, traces or operator files.

GitHub Pages/app code/demo are public; Google Sites restrictions do not protect the app URL. Clean profiles start with synthetic data. No data is uploaded by the app, no API/SSO/scheduler is implemented and no source writes/messages are enabled. Publish only reviewed static dist via manual workflow dispatch with explicit intent and passing build/security checks. Do not deploy, merge, push, change visibility or enable integrations automatically. Use synthetic records for deployment/iframe tests. Report real hosted behavior as unverified until owner publication/acceptance.

Run build/lint/unit, existing desktop regression and built-project-path/iframe browser checks; validate the manual-only workflow, artifact boundaries and branch preservation. Keep current docs/README and Phase 8 review aligned. The historical server policies below continue to govern their preserved branches.

## Read first
Read PROJECT.md, DESIGN_SYSTEM.md, FEATURES.md, DATA_SCHEMA.md, ARCHITECTURE.md, BUSINESS_RULES.md, README.md, and .env.example before implementation. Follow confirmed requirements; treat proposed settings as proposals. If requirements conflict, document the issue and reconcile the affected documents rather than silently choosing incompatible behavior.

## Non-negotiable boundaries
- Rentvine remains source of truth. No source write operations, work-order editing, approvals, assignments, closure, deletion, or automated communications.
- Build synthetic interface first, CSV next, API optionally later. Do not block CSV delivery on API access or introduce Supabase without a reviewed need.
- Do not invent API endpoints, permissions, source fields, exact brand hex values, tenant/vendor records, ratings, financial values, dates, or missing metrics.
- Never include private reports, credentials, tenant contact details, entry codes, or unredacted operational screenshots in code, GitHub, logs, fixtures, or browser builds.
- Demo content must be synthetic and visibly labeled. Never silently mix demo and operational datasets.
- Preserve approved design and exactly six main tabs: Overview, Work Orders, Action Center, Vendors, Properties, Analytics.

## Implementation expectations
Use reusable React components, Tailwind semantic tokens, typed normalized contracts, adapter isolation, shared pure rule functions, and capability-aware UI. Every visible filter/button/link must work or be explicitly unavailable with an explanation. Preserve unknown values and coverage. Do not infer source facts from missing rows, partial reports or free text. Validate safe link origins.

Keep operational access checks server-side. Protect both embedded and direct access. Never expose data by weakening authorization to solve an iframe problem. Rentvine credentials stay server-side, outside all VITE_ variables. Inspect verified source documentation and read-only scopes before API implementation; retain CSV fallback.

## Workflow
Implement in small reviewable increments. Before adding a dependency, explain its purpose and reuse existing capabilities where practical. Inspect actual sanitized report schemas before mapping. Update related contracts, rules and docs together. Keep sample fixtures synthetic and deterministic. Record unresolved product decisions rather than inventing answers. Do not deploy operational data or enable an integration without the required access/owner decisions being satisfied.

## Verification
For substantive implementation changes, run relevant type/lint/build checks once available and meaningful tests for changed behavior. Test aging boundaries, nulls, duplicate IDs, invalid/date-only values, missing assignment coverage, partial reports, comparable changes, failed import rollback, and stable queue sorting. Reconcile counts across tabs under filters. Check all six navigation destinations at desktop widths of 1366, 1440 and 1920px with keyboard navigation, plus basic narrower-viewport reflow. Validate direct anonymous access is denied and no secret appears in bundled files before deployment.

## Completion report
Explain what changed, how it was verified, and remaining decisions or limitations. Do not claim a live integration, deployment, exact brand match, or successful check unless verified. All six navigation destinations are implemented through Phase 5. Phase 6 unifies their selected Demo/CSV source and adds authenticated encrypted server persistence, administrator/viewer roles and Data & Settings. Actual identity/hosting/report approval needs configuration; Rentvine API remains disabled and unverified. See PHASE6_REVIEW.md and docs/VERIFICATION_STATUS.md.

## Desktop-first development direction
The approved TPM design is maintained. The navy sidebar is the only primary navigation; preserve all six section names. Optimize this and future phases for desktop Chrome/Edge at 1366–1920px and for the actual iframe content viewport inside Google Sites, which can be smaller than the outer browser. Do not build dedicated mobile layouts/navigation/features or spend routine QA time on mobile screenshots or extensive mobile browser suites. Retain basic reflow and existing accessibility. Keep prior mobile tests available as opt-in checks rather than deleting useful coverage. Avoid unnecessary horizontal and nested vertical scrolling. Do not weaken authorization or framing protections to make an embed work. The user has authorized Phase 7 Google Sites/deployment readiness; preserve the approved desktop-first design and read-only boundaries.

## Action Center boundaries
Keep source facts separate from rule-based recommendations. Drafts are editable local templates, not AI responses, and must never send messages or collect contact records. Do not infer missed visits, lack of response or approval duration from missing fields. Scheduled review stays unavailable until a verified appointment contract exists. No-observed-change eligibility requires compatible, sufficiently spaced observations; sourceUpdatedAt alone is insufficient. All six sections now share the selected Demo/CSV work-order workspace (Phase 6 supersedes the independent Overview demo).

## Phase 4 Vendor Watch authorization and boundaries
The user authorized Vendor Watch on top of completed Phase 3. At Phase 4 completion, Overview, Explorer, Action Center and Vendors were implemented; Phase 5 below now implements Properties and Analytics. Preserve the approved desktop design and previous read-only/source-isolation behavior.

Phase 4 originally introduced an independent memory-only vendor directory; Phase 6 now unifies source selection while preserving directory provenance and verified-ID joins. Vendor business contact fields may be mapped only from synthetic or approved redacted evaluation files; this explicit Phase 4 scope does not enable operational contact collection/access or alter Phase 3's contact-free drafts. Operational vendor contacts require approved handling and the configured server; Phase 6 masks email/phone from viewer responses and limits their availability to administrators. Names never cause joins; require matching source mode/account and explicit confirmation of Vendor ID namespace equivalence. Do not add source assignments, ratings, appointment or assignment timestamps. Work-order age is not assignment age. Template copy is user initiated; no send/dial/email integration.

## Phase 5 authorization and current scope
The user authorized Properties, Analytics and targeted improvements on top of Phase 4. All six tabs are implemented. Phase 6 supersedes the independent Overview demo: preserve the selected work-order source consistently across all six sections. Each page's filters remain independently labeled. Vendor sources still require verified scoped-ID/account/source-mode relationships; unrelated directories cannot supply joined labels or comparison metrics.

Property health is configurable count-based review only; repeated categories do not prove recurring failures. Preserve current-report metrics separately from retained prior-row evidence. Historical backlog may show only actual compatible retained observations; never reconstruct history from the current backlog. Scorecard configuration does not authorize a numerical quality formula, inferred ratings or appointment timeliness. Financial types are preparation only: no cost import/aggregation, financial permission, live synchronization or source write is enabled. Follow-up wording may use actual supplied facts without silently changing eligibility, ordering or thresholds. Keep all drafts copy-only.

## Phase 6 authorization and current scope
The user authorized a feature branch based on Phase 5 `a177e1f`, protected CSV operation independent of API approval, source management, retention, audit, role-based access and optional configured delivered-file ingestion. Do not merge, deploy publicly, activate production sync, connect live credentials or contact Rentvine. All six sections follow the selected work-order source. Data & Settings stays outside the six main tabs.

Run Node 24 strict client/server checks, build/lint, unit/server tests and desktop Chrome/Edge/iframe checks. Synthetic identity/test services must never become production identity entrypoints or bundle contents. Authenticate both app assets and data endpoints; enforce roles/CSRF on the server; withhold vendor email/phone from viewers. Keep storage/identity secrets in private server mounts. Source data, mapped originals and histories are encrypted server-side; never persist operational records in browser storage. Retain explicit snapshot/upsert and missing-row semantics.

API mode is an unavailable typed server interface pending ownership approval and verified docs; no API capabilities have been verified. Filesystem ingestion processes authorized files after delivery, not report generation, and defaults off. Actual OIDC provider/hosting/Google Sites compatibility, source privacy/mappings and backup/retention approval remain external prerequisites. Distinguish implemented, configuration-required, blocked and planned features in reviews. Earlier phase statements about independent source selection/session-only persistence are historical where superseded here.

## Phase 7 authorization and current scope
Work from Phase 6 `130f2ad` on a dedicated Phase 7 feature branch. Preserve all six workspaces and the approved visual design, CSV validation/history/security and disabled API/delivery gates. The existing Google Sites Team Portal stays the main interface; prepare an embedding service, not a second portal. Data & Settings uses four accessible sections: Data Sources, Imports & History, Automation, Security & Settings.

Prepare Google Workspace authentication through supported server-side OIDC, exact signed hosted domain/verified email and explicit subject roles. No OAuth client/secret/live provider is created or configured without separate authorization. Anonymous root/sign-out HTML may show only the data-free access gate; protected assets/data remain denied. Support top-level sign-in and the same authenticated dashboard tab if embedded cookies fail. Keep strict cookies and exact ancestor allowlisting; no permissive framing/CORS or proxy identity bypass.

Provide realistic explicitly qualified hosting estimates, precise Workspace/Sites setup, private env/secret and security checklists, backup/recovery/runbook artifacts, desktop screenshots and locally tested versus hosted-unverified limits. Tests use synthetic identities/records only. Do not request secrets in chat. Do not purchase, provision, publish, activate sync, merge or deploy; commit tested changes. Keep runtime/test services and temporary build CA material out of production artifacts. Re-test dependency/security updates and report actual results.

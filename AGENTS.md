# Instructions for coding agents

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
Explain what changed, how it was verified, and remaining decisions or limitations. Do not claim a live integration, deployment, exact brand match, or successful check unless verified. Phase 1 Overview, Phase 2 Work Order Explorer and Phase 3 Action Center are implemented. Explorer supports isolated, session-only CSV evaluation with reviewed mappings; the other three pages are placeholders. Operational authorization, shared persistence and the live API remain future work.

## Desktop-first development direction
The approved TPM design is maintained. The navy sidebar is the only primary navigation; preserve all six section names. Optimize this and future phases for desktop Chrome/Edge at 1366–1920px and for the actual iframe content viewport inside Google Sites, which can be smaller than the outer browser. Do not build dedicated mobile layouts/navigation/features or spend routine QA time on mobile screenshots or extensive mobile browser suites. Retain basic reflow and existing accessibility. Keep prior mobile tests available as opt-in checks rather than deleting useful coverage. Avoid unnecessary horizontal and nested vertical scrolling. Do not weaken authorization or framing protections to make an embed work. The user has authorized Phase 3 Action Center development; preserve the approved desktop-first design and read-only boundaries.

## Action Center boundaries
Keep source facts separate from rule-based recommendations. Drafts are editable local templates, not AI responses, and must never send messages or collect contact records. Do not infer missed visits, lack of response or approval duration from missing fields. Scheduled review stays unavailable until a verified appointment contract exists. No-observed-change eligibility requires compatible, sufficiently spaced observations; sourceUpdatedAt alone is insufficient. Explorer and Action Center share one isolated demo/CSV evaluation workspace; Overview remains its independent demo.

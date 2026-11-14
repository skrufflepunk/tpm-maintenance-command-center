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
For substantive implementation changes, run relevant type/lint/build checks once available and meaningful tests for changed behavior. Test aging boundaries, nulls, duplicate IDs, invalid/date-only values, missing assignment coverage, partial reports, comparable changes, failed import rollback, and stable queue sorting. Reconcile counts across tabs under filters. Check all six tabs at narrow/wide sizes with keyboard navigation. Validate direct anonymous access is denied and no secret appears in bundled files before deployment.

## Completion report
Explain what changed, how it was verified, and remaining decisions or limitations. Do not claim a live integration, deployment, exact brand match, or successful check unless verified. Phase 1 now includes a synthetic-only Overview application and tests. The other five pages are explicit placeholders; CSV/API adapters and operational authorization remain future work.

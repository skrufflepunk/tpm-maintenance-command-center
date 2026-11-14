# TPM Maintenance Command Center

Phase 1 of an internal, read-only maintenance dashboard. The working Overview uses **fictional demo data only**. Rentvine remains the intended source of truth for future operational versions; this application has no Rentvine connection, CSV ingestion, source mutations, or messaging.

## Run locally

Requires Node.js 22.12+ (validated here with Node 24.22.1 and npm 11.9.0).

```bash
npm ci
npm run dev -- --port 5173
```

Run these commands from the repository root. In a cloud environment where npm's default home cache is not writable, use `npm ci --cache /workspace/.npm-cache` instead. The Vite server binds to `0.0.0.0` for private cloud development; use the environment's supported private forwarding mechanism if available. Do not expose this development server publicly. Live processes must be restarted in a new task. Use the existing isolated checkout; no Git worktree is needed.

Configuration is optional for this demo. `.env.example` documents the single supported public setting, `VITE_DATA_MODE=demo`. Omitted mode defaults to demo; any other mode fails closed. All `VITE_` values are public. Never add credentials to them. No API credentials or external services are needed.

## Phase 1 behavior

- Responsive navy/blue application shell with exactly six tabs. Overview is implemented; the other five pages are clearly labeled placeholders and preserve shared filters.
- Morning Briefing, four KPI drill-downs, monthly creation/completion activity, interactive age/category breakdowns, deterministic follow-up queue, property summaries, completion durations, data health and read-only record details.
- Search, multi-select property/status/vendor/category/priority/age filters, creation-date ranges, removable filter chips, clear-all and explicit empty states. Filter families combine with AND; choices within a family combine with OR.
- All metrics and drill-downs use the same scoped records. Charts expose exact counts and keyboard-operable drill-downs; monthly activity also has an accessible table. Age/category counts remain readable as text.
- Native modal dialogs, focus return, navigation focus management, skip link, labeled controls, visible focus and reduced-motion support. Automated accessibility checks supplement browser interaction tests; they are not a complete accessibility certification.
- Validated, session-only rule editing for proposed aging, bucket, freshness and history thresholds. Queue ordering is configurable in `src/config/rules.ts`; it defaults to source urgent, pending approval, aging, then explicit unassignment, with descending age and stable ID tie-breaks.

The fixture has 24 deterministic fictional work orders, 3 fictional properties and 3 fictional vendors, including missing dates, unknown statuses/assignments and an unknown property relationship. Its fixed report time is November 13, 2026 at 14:00 UTC. The illustrative timezone is `America/Mexico_City`; it is **not an approved portfolio timezone**. Viewing time, report time and synthetic load time are shown separately. Freshness is evaluated against viewing time; the fixture never claims to be live.

No previous snapshot exists, so comparisons and no-observed-change nudges are explicitly unavailable. Unknown values are never treated as zero or as evidence of assignment absence. Completion durations keep calendar-date and elapsed-timestamp pairs separate. The navy/blue palette and generic decorative palm are provisional, not an approved TPM brand match.

## Code map

| Location                | Responsibility                                                 |
| ----------------------- | -------------------------------------------------------------- |
| `src/app`               | Shell, navigation, loading, shared scope and dialogs           |
| `src/features/overview` | Working dashboard                                              |
| `src/components`        | Shared filters, table, modal, palm and rule settings           |
| `src/domain`            | Typed contracts, pure rules, selectors and labels              |
| `src/data`              | Synthetic fixture and asynchronous repository/adapter boundary |
| `src/config/rules.ts`   | Validated versioned demo rules                                 |
| `src/styles.css`        | Tailwind semantic tokens and responsive components             |
| `tests`                 | Real Chromium browser tests                                    |

The repository interface includes `getSnapshot`, `getDataHealth`, `previewImport`, `commitImport` and `getComparableChanges`. Phase 1 advertises no import/comparison/source-link capabilities. Import operations reject without mutations; no unverified CSV schema or Rentvine endpoint is assumed. A future adapter must implement reviewed normalization, provenance, import atomicity and authorization before it can be enabled. See ARCHITECTURE.md and DATA_SCHEMA.md.

## Verification

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

`build` runs strict TypeScript checking and the production Vite bundle. `test` runs domain and repository tests. `test:e2e` starts Vite automatically when needed and runs desktop/mobile Chromium tests, including count reconciliation, filters, all six navigation destinations, chart and record drill-downs, settings, data health, dialog keyboard behavior and automated WCAG scans. A 720 CSS-pixel viewport checks reflow equivalent to a 1440px desktop at 200% zoom.

Browser tests use `/usr/bin/chromium` by default. If Chromium is installed elsewhere, set `CHROMIUM_PATH` to its executable. The cloud machine already supplies Chromium. Screenshots and any retained failure traces are written under ignored `test-results/`. There is no backend authentication to test; **do not use this demo for operational data**. Anonymous-access denial, production roles, private storage and Google Sites authentication remain prerequisites for any operational deployment.

## Specifications and remaining decisions

Read AGENTS.md and the seven other specifications before implementation. PROJECT.md defines scope, DESIGN_SYSTEM.md presentation, FEATURES.md behavior, DATA_SCHEMA.md contracts, ARCHITECTURE.md boundaries and BUSINESS_RULES.md calculations. Their full release criteria extend beyond Phase 1.

Still needed for later phases: approved TPM assets/colors, portfolio timezone and thresholds, reviewed sanitized export headers/mappings, retention, protected hosting/access provider, importer permissions, CSV pipeline and optional verified read-only API access. No Supabase dependency or API access is required for this phase. Do not commit real CSVs, private reports, screenshots, credentials, contact details or entry codes.

No application deployment is included. See REVIEW.md for review scope and verification evidence.

## Tropical Overview presentation
The reference-led visual redesign keeps the existing fictional dataset and data layer. Five color-coded KPIs, a status donut, vendor workload, property heatmap, compact sortable table, tropical header/sidebar and horizontal shortcuts complement the original dashboard controls. The right rail provides rule-based snapshot counts and working data-health/record actions. AI assistance, Rentvine access, report imports and a recent-activity event feed are explicitly unavailable. The artwork is original inline SVG, with provisional branding. Screenshots are generated as review artifacts outside source control.

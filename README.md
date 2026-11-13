# TPM Maintenance Command Center

Planning package for an internal, read-only maintenance dashboard. Build the interface first, import CSV reports next, and optionally connect a verified Rentvine API later. Rentvine remains the source of truth.

## Contents
| File | Purpose |
|---|---|
| [PROJECT.md](PROJECT.md) | Scope, phases, decisions and completion criteria |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | TPM visual direction, responsive layout and accessibility |
| [FEATURES.md](FEATURES.md) | Six tabs, filters and acceptance criteria |
| [DATA_SCHEMA.md](DATA_SCHEMA.md) | Normalized entities, CSV validation and provenance |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Adapter design, protected hosting, security and embedding |
| [BUSINESS_RULES.md](BUSINESS_RULES.md) | Metrics, unknowns, changes and configurable proposals |
| [AGENTS.md](AGENTS.md) | Coding-agent implementation boundaries |
| [.env.example](.env.example) | Safe illustrative public/server configuration template |

## Getting started
1. Extract the ZIP and put these nine files at the root of a private GitHub repository.
2. Read PROJECT.md, then the remaining specifications. Confirm pending decisions before handling operational data.
3. Have the developer scaffold React/TypeScript/Tailwind, route the six tabs, and implement shared domain contracts with synthetic fixtures. This ZIP has no package.json, runnable app, installed dependencies, or deployment.
4. Once configuration loading exists, copy .env.example to a local ignored .env and configure only the settings needed for that phase. No API credentials are needed for the interface or CSV phase. Add .env, .env.*, real CSVs, snapshots and private assets to .gitignore while explicitly allowing .env.example. The developer must provide and verify .gitignore; it is not included here.
5. Inspect sanitized source headers, define reviewed mappings/statuses, test preview/import and all missing-data cases, then import approved reports in a protected environment.
6. Choose protected hosting and an access provider; verify direct and embedded access restrictions before Google Sites use. Follow ARCHITECTURE.md if iframe sign-in cannot work.
7. Only investigate API implementation after the read-only capability and account-owner access decisions are confirmed.

No install/build command is prescribed until an application scaffold and lockfile exist. The implementing developer must document exact runtime requirements, commands, verified environment handling, deployment steps, and tests in this README when code is added.

## Data and access
Do not upload real tenant/vendor data to a public repo or public demo. Vendor business contacts are internal information. Redact or omit free-text summaries that may include private details. Never place credentials in browser settings, URLs, CSVs, or source control. Secure Google Sites membership alone does not secure the embedded application.

## Basis and open items
Prepared from the referenced “Maintenance Dashboard Plan” conversation and the current request. The later six-tab, dashboard-first direction supersedes earlier five-tab and Google Sheets-first suggestions. Sheets/Apps Script automation is optional future work. No source CSV schemas, screenshots, brand assets, endpoint documentation or operational records were validated for this package. Historic record counts and vendor names are deliberately not used as fixtures or current facts.

Thresholds, scheduling examples, layout breakpoints and implementation choices explicitly marked proposed remain configurable proposals. Exact TPM color values, approved palm/logo assets, report scope/mappings, timezone, access provider, retention, and optional API feasibility still need confirmation. Morning Briefing and aging nudges are rule-based in-app guidance, not a messaging service or emergency monitoring system.

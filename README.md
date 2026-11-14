# TPM Maintenance Command Center

An internal, read-only React/TypeScript maintenance dashboard. All six workspaces are implemented: Overview, Work Orders, Action Center, Vendors, Properties and Analytics. Phase 6 adds **Data & Settings**, unified Demo/CSV source selection and a protected server for approved CSV operation. Phase 7 adds four settings sections, Google Workspace policy preparation, safe Google Sites sign-in/fallback, a non-root deployment image and operator backup/runbook artifacts. Rentvine API approval is **not required** for the CSV route. API synchronization remains disabled pending ownership approval and verified documentation.

No live Rentvine connection, source writes, message sending, real company data, public deployment or merge is included. The included records, browser demonstrations and identity provider are synthetic.

## Phase 7 deployment preparation

The existing restricted Google Sites Team Portal remains the main interface. The HTTPS embedding service independently authenticates staff; its root/sign-out gates contain no maintenance data. Google mode requires signed Workspace-domain/verified-email checks plus explicit administrator/viewer subjects. Framed sign-in opens a user-controlled tab, with a secure same-dashboard fallback if embedded cookies are blocked. No live Google client, secret, account, public service or Site is configured here.

Data & Settings has **Data Sources**, **Imports & History**, **Automation**, and **Security & Settings**. Imports move to their own section; keyboard tab navigation, section reload links, draft preservation while switching panels and actual latest-successful CSV-load time improve the desktop workflow. Existing calculations/data-source boundaries remain unchanged. Old Phase 6 sessions sign in again after upgrading; encrypted records are compatible.

Recommended planning architecture: one always-on managed web service with private persistent disk and the prepared Node 24 non-root image, subject to actual platform verification. Budget **US$30–50/month**, explicitly unverified planning allowance. No purchase/deployment is authorized. See:

- [Hosting comparison and costs](docs/HOSTING_OPTIONS.md)
- [Google Workspace administrator setup](docs/GOOGLE_WORKSPACE.md)
- [Exact Google Sites embed/fallback steps](docs/GOOGLE_SITES.md)
- [Environment/secret/security checklist and TPM approvals needed](docs/PRODUCTION_CHECKLIST.md)
- [Container/VM/backup operator runbook](ops/README.md)
- [Phase 7 review and local test limits](PHASE7_REVIEW.md)

The Dockerfile pins a verified Node image digest, keeps runtime dependencies only, and has no deploy/publish automation. VM service/proxy templates are examples to review, not installed services. An encrypted consistent backup CLI (`node build-server/backup.mjs SOURCE_DATABASE PRIVATE_BACKUP_FILE`) excludes ephemeral sessions/login/stages; key custody and off-host retention remain operator responsibilities. `scripts/test-container.sh IMAGE_TAG` runs a synthetic non-root runtime smoke without network or published ports after a reviewed local image build. Do not use the test identity service as production authentication.

Actual provider docs/pricing/Google metadata were blocked by network policy during this task. Real host/Workspace/Google Sites cookie/ancestor behavior, permissions and backup restore still need approved hosted acceptance. API and automatic delivery stay off, and the CSV route remains independent of API approval.

## Local synthetic evaluation

Requires **Node 24+** (validated with Node 24.22.1/npm 11.9.0).

```bash
npm ci
npm run dev -- --port 5173
```

Run from this repository. If the default npm cache is not writable, use `npm ci --cache /workspace/.npm-cache`. Vite binds to `0.0.0.0` for private cloud development; use supported private forwarding only. Never publish this development server or use it for operational records. No external services or credentials are needed for Demo or local synthetic/redacted CSV evaluation.

The root [.env.example](.env.example) documents `VITE_DATA_MODE=demo`, the only supported public initial mode. **All `VITE_` values are public.** Runtime CSV selection is managed by the workspace, not by placing data or credentials in environment variables. Local imports and drafts are memory-only; browser reload clears local evaluation. No records/tokens are persisted to localStorage/sessionStorage.

The unchanged fixture has 24 fictional work orders, three properties and three vendors, including missing dates, unknown statuses/assignments and an unresolved property relationship. Its fixed report time is November 13, 2026 at 14:00 UTC. Its illustrative `America/Mexico_City` timezone and rule defaults are not approved operational settings. Unknown facts remain unknown; historical comparisons, appointments, ratings, costs and AI functionality are not fabricated.

## CSV operating route

Open the sidebar utility **Data & Settings → Imports & History**. Map actual report headers, review enum mappings, declare account/scope/timezone/report time and validate before committing. Work-order, vendor and property reports are separate. Actual Rentvine headers have not been verified; no native names are assumed. Stable IDs are mandatory, duplicate IDs block commits, and catalog joins require explicit verified ID equivalence and the same account/source mode. A vendor-only/property-only CSV workspace does not borrow fictional work orders.

All six sections use the same selected work-order source, including Overview; page filters remain independent. Demo records never merge with CSV. Full snapshots archive absent records separately from active totals, without inferring closure. Incremental upsert retains disclosed last-known rows and does not invent comparable history. Replays do not duplicate records or create artificial observations. Failed, stale or invalid imports retain the last successful dataset.

For approved operational CSV data, configure the protected server first:

1. Review [CSV-only setup](docs/CSV_ONLY.md) and [deployment/security architecture](docs/DEPLOYMENT.md).
2. Configure an approved OIDC client, immutable staff subject/role allowlist, protected storage key/secret mounts, durable private disk, HTTPS host and reviewed privacy/retention policy using [server/.env.example](server/.env.example).
3. Build and run the protected server under the approved service manager/reverse proxy:

   ```bash
   npm ci
   npm run build
   node --env-file=/etc/tpm/server.env build-server/index.mjs
   ```

Production protects app assets and data endpoints independently of Google Sites. Node listens on loopback by default. Administrators approve sources, import reports and manage configuration/retention/audit; viewers read authorized datasets with vendor email/phone withheld. Encrypted SQLite stores normalized records, original mapped cells, import history and safe audit metadata. Secrets remain server-only. Original unmapped columns are discarded, not logged or sent back to browsers.

Optional scheduled processing requires both operator configuration of a private filesystem inbox and an administrator-approved saved mapping/schedule. It processes files **after delivery**; Rentvine report generation/delivery is unverified. All production processing gates remain off here. Cloud/email connectors are not implemented.

## Existing workspaces

- **Overview:** Morning Briefing, five scoped KPIs, status/aging/category/event charts, vendor workload, property heatmap, sortable records and honest data health.
- **Work Orders:** searchable/sortable/filterable/paginated register, source-qualified details, dates/approval/assignment coverage and read-only next recommendations.
- **Action Center:** deterministic multi-reason follow-up queue, interactive Morning Briefing, compatible retained-observation evidence and editable copy-only drafts. No messages are sent.
- **Vendors:** scoped directory, verified workload joins, profiles, evidence/sample-qualified scorecards and copy-only drafts. Missing ratings/appointments remain unavailable.
- **Properties:** supplied zero-workload entities, unknown relationship group, filters/profiles and configurable count-based review signals. Repeated categories do not prove recurring defects.
- **Analytics:** actual-event charts, scoped breakdowns, precision-qualified completion cohorts, comparisons and compatible retained observations. No reconstructed backlog curve or financial values.

Core rules stay shared and validated. Authenticated CSV uses administrator-configured aging/follow-up/review/freshness/retention policies; local Demo settings remain illustrative. Source-date calculations keep each report's declared timezone; receipt/audit display uses Mexico City. Changing source/identity resets source-bound views and drafts. Authentication loss clears cached operational datasets even while Demo is selected.

## Verification and synthetic demonstration

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

Build checks strict client/server TypeScript, produces Vite assets and bundles the protected server. Unit tests include domain calculations, parsers, persistence, rollback, ingestion gates and signed mock-OIDC/security tests. Browser tests automatically start Vite and explicitly synthetic loopback test services, exercise existing workspaces plus protected CSV roles/source switching, and scan WCAG rules. The synthetic identity provider generates ephemeral test keys and is excluded from the production server entrypoint. Never use it for operational identity.

The default browser matrix is Chrome at 1366/1440/1920px and Edge at 1440px when installed, with local 1060×620 iframe and basic narrower reflow coverage. This does not certify a real Google Site. Browser binaries may be selected using `CHROME_PATH`, `EDGE_PATH` or `CHROMIUM_PATH`; otherwise the prepared `/workspace/browser-cache` runtimes or `/usr/bin/chromium` are used. Optional `python3 scripts/prepare-desktop-browsers.py` retrieves official manifests/packages with SHA-256 verification. Existing mobile checks remain opt-in via `LEGACY_MOBILE_TESTS=1 npm run test:e2e -- --project=mobile`; dedicated mobile work is not the current development target.

For a focused CSV demonstration:

```bash
npm run test:e2e -- --project=desktop tests/phase6.spec.ts
```

See [demonstration steps and illustrative CSV](docs/CSV_DEMO.md), [Phase 6 review/test evidence](PHASE6_REVIEW.md) and [verification status](docs/VERIFICATION_STATUS.md). Screenshots use synthetic data and are saved outside Git; test traces/results are ignored.

## API, embedding and external prerequisites

[API setup if approved](docs/API_ROUTE.md) describes the evidence/authorization required before implementing a real reader. The server-only typed adapter is explicitly unavailable; no Rentvine endpoint/authentication/pagination/rate-limit/native-field capability has been verified. Public documentation retrieval was blocked in this environment. No live credentials are requested, generated or activated.

[Google Sites instructions](docs/DEPLOYMENT.md#google-sites-steps-and-required-real-portal-tests) require separate application authentication. Framing defaults to denied, with exact HTTPS ancestor allowlisting only after review. Production cookies are Secure/HttpOnly/SameSite=None but browsers may block third-party cookies. Use authenticated top-level access if the protected iframe cannot function. No actual host, company identity provider, portal ancestor chain, TLS/backup system or real cookie behavior has been configured/tested here.

## Code and specifications

| Location | Responsibility |
| --- | --- |
| `src/app`, `src/features` | Shared shell and six workspaces plus Data & Settings |
| `src/domain`, `src/config` | Typed records, shared pure calculations and validated policies |
| `src/data` | Demo/CSV parsers, normalized contracts, source coordination and protected client |
| `server` | Authentication, authorization, encrypted persistence, imports and optional file processing |
| `server/integrations` | Disabled typed Rentvine reader interface |
| `tests`, `test-support` | Synthetic browser workflows and test-only services |

Read [AGENTS.md](AGENTS.md), PROJECT.md, DESIGN_SYSTEM.md, FEATURES.md, DATA_SCHEMA.md, ARCHITECTURE.md and BUSINESS_RULES.md before development. Their Phase 6 current-release sections supersede historical independent Overview/vendor source and session-only operational limits. Historical reviews remain in REVIEW.md and PHASE2_REVIEW.md through PHASE5_REVIEW.md. The approved navy sidebar, original palm/mountain artwork, six main navigation labels and desktop-first design are preserved.

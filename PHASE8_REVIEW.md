# Phase 8 — Free GitHub Pages edition

Branch: `feat/phase-8-github-pages`, based on Phase 7 **`1f8a0e1`**. The original server edition is preserved unchanged on **`archive/phase-7-server`** and **`feat/phase-7-sites-readiness`** at that same commit. Preservation is local in this workspace; no branch push, merge, visibility/default-branch change, workflow dispatch, Pages deployment or Google Site publication was performed.

## Delivered static application

The six existing Overview, Work Orders, Action Center, Vendors, Properties and Analytics sections retain their TPM desktop shell, original tropical artwork, filters, charts, qualified calculations, record evidence and read-only/copy-only workflows. All six share the selected Demo/CSV source with independent page scopes. No source write, message send, invented appointment/rating/cost/activity/AI response or live Rentvine request is added.

There is no always-running backend, OIDC/Google sign-in, role system, server database, secret mount or paid hosting dependency in this branch. Server code, dependencies, runtime scripts, deployment artifacts and server-only tests are retained on the archive branch rather than bundled into the static edition. A modern browser runs the finished app; Node 24 is only a development/build tool. Local test fixture HTTP servers do not become application services.

Manual work-order, vendor and property imports reuse the existing explicit header/enum mapping and CSV validation. Only mapped source columns are projected into storage; arbitrary unmapped notes/attachments are discarded. Stable IDs, account/verified-namespace joins, nullable unknown values, date precision and source-as-of/receipt distinctions remain intact. Snapshot replacement keeps the previous compatible work-order/vendor observation separate from current totals; missing rows are not inferred completed/deleted. The static edition does not implement the server branch's incremental upsert/archive/scheduler policy.

Data & Settings provides Data Sources, Imports & History, Local Data & Backups, Settings. The browser-local workspace persists selected source, bounded current/prior mapped reports, local rule/review preferences and up to 50 accepted/replay entries. Rules remain shared pure domain functions. No message drafts or raw unmapped files enter a backup. Receipt display uses Mexico City; CSV calculations retain declared source timezone.

## Local storage and recovery safeguards

- IndexedDB stores one path-namespaced workspace with a **12 MiB serialized UTF-8 limit**; CSV limits remain 2 MiB/report, 10,000 rows, 100 columns and 500 characters per mapped cell. Actual browser quota/policy may be smaller.
- Loading/restoring re-runs schema and original CSV parsers rather than trusting normalized objects from JSON. Unknown fields, invalid structure/rules/mappings, incompatible accounts, duplicate IDs, oversized files and malformed/future receipts reject safely. Optional invalid source facts retain the original parser's unknown/coverage behavior.
- Atomic writes and fresh generation tokens prevent stale tabs overwriting a new/cleared workspace. Failed/quota writes roll back the current normalized view; corrupt stored data is left untouched until explicit clear/restore. Blocked storage uses visibly temporary memory instead of requiring a server.
- JSON export/restore preserves mapped values, original receipt/observation identities, settings and local history. A checksum detects accidental corruption, not authenticity or malicious editing; validation still applies to a valid/recomputed checksum. Restore has preview and explicit replacement confirmation.
- Confirmed full clear resets reports/history/preferences/current view, writes an empty generation marker and notifies other views in the same partition where BroadcastChannel exists. Unrelated browser keys remain untouched. Downloaded backups, other profiles/partitions/devices and forensic disk copies are outside these controls. Legacy report-specific clear controls remove their saved CSV report sets; export any needed backup first.

**Local data/backups are unencrypted and not password-protected.** Same-profile users and other apps sharing `OWNER.github.io` can access origin storage. Repository path names organize data but are not security boundaries. Use a trusted dedicated profile/origin, minimize/redact reports and protect/export backups regularly. Eviction, private browsing, site-data clearing and changing profiles/devices/origins can lose data. Embedded/top-level partitions may differ; local backup transfer and the same app in a new tab are the fallback. No automatic PII redaction, cloud sync or durable server audit is claimed.

## Pages deployment and Google Sites

The $0 target assumes an eligible GitHub Free **public** repository, standard Actions/Pages and a free `github.io` URL within normal account/service limits. No custom domain/paid runner/server is required. Review current eligibility and all repository/history contents before any visibility change; use a clean public static-only repository if necessary.

**GitHub Pages is public hosting. Google Sites access restrictions do not protect the hosted application/direct URL.** Clean profiles see only the explicitly fictional demo; imports are not uploaded by this app. There is no fake frontend password, Workspace check or API credential entry.

The pinned Pages workflow is **manual `workflow_dispatch` only**, defaults to review-only and requires publish=true plus exact **`PUBLISH`** for publication. Build/artifact review, lint, unit tests, dependency audit and production browser checks must pass before the separate least-privilege Pages deployment job/environment gate. Only `dist/` is uploadable; source reports, backups, browser databases, tests/traces and server/operator files are excluded. Pins were resolved from upstream action tags, but the hosted workflow was not dispatched here. The workflow must exist on the default branch before its Run workflow UI is available; this owner step is explicitly documented.

Vite uses relative asset paths and hash navigation. A production meta CSP precedes scripts and blocks connections, form submission and plugins; no external runtime assets, backend requests, OAuth or analytics are used. The static artifact guard checks asset types/paths/policy and known credential/backend/report patterns. This is a bounded automated check, not proof that arbitrary Git history is free of confidential material. A meta policy cannot authenticate users, isolate sibling same-origin apps or enforce `frame-ancestors`/custom Pages response headers.

[Deployment instructions](docs/DEPLOYMENT.md), [Google Sites steps](docs/GOOGLE_SITES.md), [local CSV/backup operations](docs/CSV_ONLY.md), [publication/security checklist](docs/PRODUCTION_CHECKLIST.md) and [hosting assumptions](docs/HOSTING_OPTIONS.md) are delivered. Use the actual published HTTPS project URL with Google Sites Insert → Embed → By URL, prefer 1060px+ width/800–1000px height, and test the actual published portal with synthetic data after approved manual publication. If storage/download/clipboard policy blocks the iframe, use the new-tab view and local transfer. No live Pages/Site behavior is claimed as certified before that step.

## Verification results

- Strict TypeScript + `npm run build`: passed; only static assets in `dist`, relative paths, original favicon, production CSP before scripts, no backend/credential/report artifact patterns.
- `npm run lint`: passed.
- `npm test`: **121 passed across 19 files**. Retains the applicable prior domain/CSV/repository/rule coverage and adds eight local-state/backup integrity cases: mapped projection, quoting/mapping order, round trip/source identity and timestamps, malformed/unsupported/tampered JSON, recomputed-checksum invalid records/unmapped fields, unknown optional values, account/config/receipt failures, size/history limits and compatible prior/replay preservation.
- `npm run test:e2e`: **136 passed** — 34 each in Chrome at 1366/1440/1920px and Edge at 1440px. Includes the original 27 dashboard workflows per target plus seven static cases: three-report persistence/all-six isolation/rules; download/clear/restore/tamper rejection; replay/duplicate rollback; blocked-storage temporary mode; cross-tab clear/unrelated-key preservation; quota/write failure rollback; corrupt stored-data quarantine/recovery. Existing filters/charts/analytics/keyboard/dialog/WCAG and desktop/iframe regressions pass.
- `npm run test:pages`: **6 passed** — production project-subpath and cross-origin iframe/new-tab checks in Chrome and Edge, including actual local import/reload, anonymous fictional defaults, relative assets, keyboard/WCAG behavior, no backend/external requests and no production console/CSP errors. Test output directories are separated from the dev regression suite. Final suites ran sequentially after correcting test artifact interference and a missing favicon found during validation.
- Full `npm audit --audit-level=high`: **0 vulnerabilities**. No new runtime dependency was added; `jose`/`tsx` and the backend runtime scripts were removed from this edition.
- Manual-only workflow/default-review/deploy-dependency assertions passed locally. No hosted Actions or deployment was run.
- Phase 7 branch refs resolve to exactly `1f8a0e181e56a1a12bea8cbd4dbbcbde59ebe93e`; no server branch changes.
- Final bounded credential/bundle review, current documentation links and `git diff --check` pass before commit. Automated scans/tests are not an independent security audit or a live hosting certification.

## Owner steps remaining

Review code/history/public-hosting suitability; push the preserved archive and reviewed static edition to the intended remotes; choose the static/default branch and eligible public repository; select Pages → GitHub Actions; run review-only, then explicitly confirm publication when desired; perform the actual published Google Sites storage/download/layout acceptance with synthetic records. No real data or secret should be provided in chat or published to the repository. All application functionality is usable without paid hosting; external publication/portal acceptance is deliberately unperformed.

## Synthetic review artifacts

- [Reviewed static build ZIP](/workspace/artifacts/tpm-static-pages-build.zip) — contents of `dist/` only; no reports or backups.
- [Static import/storage dashboard](/workspace/artifacts/tpm-phase8-imports.png)
- [Built project-path iframe](/workspace/artifacts/tpm-phase8-pages-iframe.png)

Artifacts contain only synthetic records and stay outside Git/Pages. Historical Phase 1–7 reviews describe their own preserved releases; current Phase 8 instructions in the eight specifications supersede earlier server-only requirements for this authorized static edition.

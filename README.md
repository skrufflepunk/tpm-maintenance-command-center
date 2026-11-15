# TPM Maintenance Command Center — Free Static Edition

Phase 8 is a **single-user, browser-only dashboard** for free GitHub Pages hosting and embedding in the existing Google Site. Overview, Work Orders, Action Center, Vendors, Properties and Analytics retain the existing TPM desktop design, shared rules, filters, charts and read-only workflows. Rentvine is never modified; drafts remain editable and copy-only.

**GitHub Pages is public hosting. Google Sites access restrictions do not protect the hosted app or its direct URL.** There is no sign-in, server authorization, API key, backend process, paid hosting service or cloud data synchronization in this edition. Visitors start with clearly fictional demo data; their CSV imports are processed locally and are not uploaded by the app.

## Run and verify locally

Node 24+ is needed only for development/building; the published site needs a modern desktop Chrome/Edge browser, not a running Node server.

```bash
npm ci
npm run dev -- --port 5173
npm run build
npm run lint
npm test
npm run test:e2e
npm run test:pages
```

If the default npm cache is not writable in this workspace, use `npm ci --cache /workspace/.npm-cache`. Local Vite/preview is for development only. `build` runs strict TypeScript, produces static `dist/` assets with relative paths, applies a production Content Security Policy and checks for backend/credential/report artifacts. `test:pages` serves that built bundle under a project path and in a synthetic cross-origin iframe; it does not contact GitHub Pages or publish anything. The local fixture HTTP servers are test tools, not an application backend.

The regular browser matrix uses Chrome at 1366/1440/1920px and Edge at 1440px when installed; CI can use Playwright's downloaded Chromium. Optional legacy narrow/mobile checks remain opt-in. No dedicated mobile feature work is included. Screenshots/traces use synthetic records only and stay outside published assets.

## Browser CSV workflow

Use **Data & Settings → Imports & History**, or the existing Work Orders/Vendors import controls. Upload work-order, vendor and property reports separately, map actual headers and enum values explicitly, declare account/scope/timezone/report date, validate and review before loading. No Rentvine-native column names or API fields are assumed. Stable IDs are required; duplicate/missing IDs reject the candidate. Unknown/invalid optional fields remain unknown with coverage warnings. Vendor/property joins need verified ID namespaces and the same account; names never create joins. Demo rows never fill CSV gaps.

Imports replace that dataset's current observed snapshot. The previous work-order/vendor observation remains separate for compatible comparisons and missing-row evidence; absence never means closure/deletion. Full reports may still be partial in scope. The static edition has no server upsert/archives, multi-user role management or scheduled processing. Those server features remain available on the preserved Phase 7 branch.

All six sections follow the selected Demo/CSV workspace while keeping independent page filters. Configurable local aging/follow-up/property review/scorecard settings use the original shared domain functions. Source calculations keep each report's declared timezone; receipt/audit-style display uses Mexico City. No appointments, ratings, costs, history or AI claims are invented.

## Local storage, backup and clear

Validated mapped columns and metadata are stored in **IndexedDB**, scoped to this app's URL path. Unmapped report columns are discarded. The app caps saved state at **12 MiB**; each CSV remains limited to **2 MiB, 10,000 rows, 100 columns and 500 characters per mapped cell**. It retains current/previous work-order and vendor reports, the current property report, local settings and up to 50 load/replay entries. Actual browser quota/policy may be lower. Failed/quota/stale-tab writes retain the previous saved data. Corrupt stored data is quarantined for explicit clear/restore rather than silently overwritten.

**Data & Settings → Local Data & Backups** provides JSON export, validated restore preview and confirmed clear-data controls. Backup JSON contains mapped report values, receipt times, settings and local history. A SHA-256 integrity check detects accidental changes; it is not a signature or access control. Restores re-run schema and CSV validation before replacing anything. Clear removes this edition's reports/history/settings and resets the local view, including other open tabs in the same storage partition when BroadcastChannel is available; it leaves unrelated apps/site keys alone. Existing downloads, other browser profiles/partitions/devices and forensic disk recovery are outside these controls.

**Local data and backups are not encrypted or password-protected.** Anyone using the same browser profile/origin may access them. GitHub project paths are not origin security boundaries: other apps on `OWNER.github.io` share that origin. Use a dedicated trusted Pages origin/account and browser profile, minimize/redact reports, protect downloaded backups and export regularly. Browser eviction, private browsing, device/profile changes or site-data clearing can lose data. Embedded and top-level storage may be partitioned; export/restore when moving between them. If storage is blocked, the app explicitly falls back to temporary memory and offers a new-tab path. There is no silent cloud backup or guaranteed durable storage.

## Publishing and Google Sites

See [GitHub Pages instructions](docs/DEPLOYMENT.md), [Google Sites embed steps](docs/GOOGLE_SITES.md), [local data guide](docs/CSV_ONLY.md), and [static security checklist](docs/PRODUCTION_CHECKLIST.md).

The prepared [Pages workflow](.github/workflows/pages.yml) has **only `workflow_dispatch`**, no push/PR/schedule trigger. It defaults to review-only. Publishing additionally requires the manual publish checkbox, exact `PUBLISH` confirmation, passing build/lint/unit/audit/production-browser checks and the Pages environment gate. Third-party actions are pinned to upstream tag SHAs verified during preparation. Only reviewed `dist/` is uploaded; source reports, browser databases, JSON backups, tests and traces are excluded. No workflow or Pages deployment was run in this task.

The $0 route assumes an eligible **GitHub Free public repository**, normal Pages/Actions limits and the free `github.io` URL; no custom domain or paid runner is required. Private-repository Pages availability can depend on a paid plan. Review the entire repository/history for confidential material before making anything public; use a clean public static-only repository if needed. Do not change visibility or publish the historical server repository blindly.

Use Google Sites **Insert → Embed → By URL** with the published HTTPS project URL. Prefer 1060px+ actual content width and 800–1000px height; the tested constrained frame is 1060×620. Hash navigation and relative assets work at repository subpaths. If browser policy blocks storage/downloads, use **Open dashboard in a new tab** and transfer a private local backup as needed. Actual published Site/browser acceptance remains a user step after approved publication; local tests do not certify a real Google Site.

## Preserved server edition

The complete Phase 7 server implementation is unchanged at **`1f8a0e1`** on **`archive/phase-7-server`** and **`feat/phase-7-sites-readiness`**. It includes OIDC/roles, encrypted server SQLite, optional gated delivery and server deployment artifacts. This static branch intentionally removes those runtime requirements. Branch preservation is local in this workspace; push the archive separately when preparing a remote review. No branch is merged or published automatically.

See [PHASE8_REVIEW.md](PHASE8_REVIEW.md) for implementation/test results and limitations. Earlier phase reviews describe their historical branches; current Phase 8 sections in the eight specifications supersede server-only/no-browser-storage requirements for this explicitly authorized edition. No real TPM/customer data, credential, live Rentvine connection or source write is included.

# Phase 7 — Google Sites integration and deployment readiness

Branch: `feat/phase-7-sites-readiness`, based on completed Phase 6 **`130f2ad`**. No merge, registry publication, public deployment, purchase, Site edit/publication, Google OAuth client creation, company credentials, operational report, live Rentvine request or automatic ingestion activation is included.

## Implemented changes

**Data & Settings** now has four real accessible tabs: Data Sources, Imports & History, Automation, Security & Settings. Arrow/Home/End keys, focus/selection/panel semantics, section-only reload URLs and unsaved form preservation across tab switches are tested. Imports/history/health moved together; source creation collapses after selection; all source policies, import validation, configuration, audit and administrator controls remain. Actual latest successful retained CSV-load time stays separate from source report/check freshness and excludes placeholder workspace creation. Settings tables fit the 1060px desktop frame without unnecessary horizontal scroll.

**Portal access** uses data-free anonymous root/sign-out gates; application assets and every maintenance API remain protected. Framed login/callback requests never redirect into the identity provider. Staff open sign-in in a user-controlled new tab, then reload the Team Portal frame; an embedded toolbar links to the same authenticated dashboard if browser restrictions prevent iframe cookies. Logout revokes the local session and shows a signed-out gate without restarting SSO automatically. It does not claim Google global logout. Cookies, CSRF, roles, CSP and exact ancestor restrictions remain intact; default framing is denied.

**Google Workspace preparation** adds a server-only `google_workspace` profile requiring canonical Google issuer, approved exact domain, private nonempty web-client secret mount, signed `hd` and `email_verified=true`, and the existing immutable-subject role allowlist. A request hint/email suffix/Site membership cannot authorize a user. Sessions bind provider/domain; Phase 6 sessions must sign in again after upgrade. Secret/role file permissions and listener/port configuration fail closed. No Google provider/client/domain/credentials have been activated; synthetic signed issuer tests exercise the claim policy rather than proving live Google compatibility.

**Deployment artifacts** include a pinned Node 24 multi-stage non-root Dockerfile, Docker context exclusions, explicit validated container bind setting, private server/Google environment templates, Caddy/systemd VM examples and an operator runbook. There is no deploy pipeline, hosted service or public marketing site. The existing Google Site remains the main interface.

**Recovery** adds an operator-only consistent ciphertext SQLite backup CLI. It requires private paths, refuses overwrite and publishes a complete 0600 backup without the recovery key. Backup copies exclude sessions/login attempts/staged imports so a restore cannot resurrect revoked sessions or uncommitted previews. Source sessions remain unchanged. Synthetic restore tests verify ciphertext, data recovery and ephemeral-state exclusion; actual off-host recovery/key custody still needs operator acceptance.

**Security tooling**: the container audit exposed inherited development-tool advisories. Vitest was updated from 3.2.x to **4.1.12**, and a scoped `@typescript-eslint/typescript-estree` minimatch override selects **11.0.8**; lint/build/all tests pass with the updates. No runtime application dependency or source-data schema was added. Full npm audit now reports zero vulnerabilities. This is not an OS/image scan or independent security certification.

## Hosting recommendation and costs

Conditional recommendation: **one always-on paid managed web service with private persistent local disk** (Render candidate), Google Workspace authentication and the current encrypted SQLite adapter. Planning budget **US$30–50/month**, before taxes, existing Workspace licensing and operator labor. It is an unverified engineering allowance, not a current vendor quote. A small VM is a lower-cash-cost alternative with greater patch/TLS/backup responsibilities. Google Compute Engine is viable but has more billing/IAM/operations work. Cloud Run/serverless with ephemeral local storage is unsuitable as-is; an external database adapter would be a separate project.

[Hosting comparison](docs/HOSTING_OPTIONS.md) includes estimated component budgets, operational limits and operator reference links. Confirm provider Node/container support, disk ownership/private permissions/encryption, secrets, backup/restore, single-instance/idle behavior, HTTPS/header preservation and price before purchasing. No provider was selected/provisioned on TPM's behalf. Documentation retrieval for Google/hosting was blocked (403) by the managed environment's enforced destination policy.

## Instructions delivered

- [Google Workspace setup](docs/GOOGLE_WORKSPACE.md): company administrator/client/subject enrollment, minimal scopes, private secret configuration, access/removal/session policy and required live checks.
- [Google Sites embedding](docs/GOOGLE_SITES.md): exact Embed by URL procedure, practical dimensions, actual ancestor review, sign-in/reload/fallback and a hosted acceptance record.
- [Secret/environment and production security checklist](docs/PRODUCTION_CHECKLIST.md): complete variable/file table, access/backup/security checks and TPM decisions required before deployment.
- [Operator runbook](ops/README.md): managed/container and VM routes, tested backup CLI/restore procedure, patching/rollback and local image smoke command.
- Existing [CSV-only route](docs/CSV_ONLY.md), [API preparation](docs/API_ROUTE.md) and [deployment guide](docs/DEPLOYMENT.md) remain linked and supported. API and delivered-file automation stay disabled by default; no new endpoint/capability is invented.

## Verification

- `npm run build`: strict client/server TypeScript and production frontend/server/backup bundles passed on host Node 24.22.1.
- `npm run lint`: passed.
- `npm test`: **140 passed across 21 files**, including all original domain/data regressions, 11 authentication/security cases, 14 persistence/ingestion cases and two backup/recovery cases. New policy coverage includes wrong/missing signed domain, unverified email, unlisted subject, provider-policy changes, expiry, secure production cookies, data-free framed fallback and logout without automatic reauthentication.
- `npm run test:e2e`: **140 passed** — 35 each in Chrome at 1366/1440/1920 and Edge at 1440. Includes Phase 1–6 functional regressions, actual CSV preview/commit/reload/idempotency/role checks, keyboard/dialog/WCAG checks, settings tab/deep-link/draft behavior, source timestamp display and synthetic protected iframe/new-tab/logout flows.
- After the final settings table-width correction, `npm run test:e2e -- tests/phase7.spec.ts`: **12/12 passed** across the same four targets. The 1060×620 frame checks actual region widths in addition to root overflow and fixed sidebar/modal behavior.
- Full `npm audit --audit-level=moderate`: **0 vulnerabilities**, including development dependencies, after the scoped toolchain updates. Runtime-only audit also clean.
- Pinned multi-stage container built locally with Node 24.22.3. The standard build initially could not trust the cloud npm interception CA; a **temporary external Dockerfile** mounted the supported CA as a BuildKit secret for install steps with strict TLS enabled. No CA or proxy credential was baked into the repository/runtime. A non-root package ownership startup issue found by runtime testing was corrected.
- `scripts/test-container.sh tpm-phase7-local:review`: passed. No outbound network or published ports; verifies non-root runtime, excluded test identity/source directories/CA, fail-closed absent configuration, successful actual server startup with private synthetic mounts, health response, data-free access page and anonymous API/asset denial with strict framing/no-store headers. Synthetic key/config is discarded with the test container.
- Bounded credential-pattern/bundle isolation scan and `git diff --check` are performed before commit. No raw reports, company credentials or private staff information are included.

Local iframe tests use an explicit **synthetic loopback-only** ancestor fixture; production configuration still rejects HTTP/wildcard framing origins. Synthetic signed identity tests do not contact Google or Rentvine. No dedicated mobile development/QA was added.

## Implemented versus outstanding

| Status | Scope |
| --- | --- |
| Implemented and locally tested | Four settings sections, preserved CSV/roles/configuration, actual load metadata, data-free access/sign-out gates, framed secure-tab fallback, signed Workspace policy enforcement, session policy binding, private config validation, non-root container build/smoke, encrypted backup/restore and dependency regression checks. |
| Implemented but needs approved configuration | Actual Google web client/domain/secret mounts/subject roles; final HTTPS app host, private durable disk/key/backup custody, exact portal ancestors and controlled deployment settings. VM/proxy templates need selected-host validation. |
| External verification/authorization pending | Current hosting features/prices, company Google policy/client and actual discovery behavior, real published Site ancestor/cookie/third-party restrictions, hosted identity/expiry/removal/restore acceptance, final TPM deployment go-ahead; separate Rentvine API approval/docs. |
| Planned, not implemented | Continuous Google-wide session revocation/global logout, multi-instance/high availability, external-database migration, cloud/email ingestion, multiple scheduled datasets per source, automated PII redaction/per-property authorization and live Rentvine/financial/appointment integrations. |

Needed from TPM: approved provider/region/budget/host, Workspace domain and administrator, staff roles and secure subject onboarding, portal editor/verified ancestors, approved report/timezone/retention/privacy rules, recovery/monitoring owner and final deployment approval. No passwords, OAuth secrets, keys, raw tokens or production reports should be sent in chat.

## Desktop artifacts (synthetic only, outside Git)

- [Data Sources desktop](/workspace/artifacts/tpm-phase7-settings-desktop.png)
- [Imports & History](/workspace/artifacts/tpm-phase7-settings-imports.png)
- [Automation](/workspace/artifacts/tpm-phase7-settings-automation.png)
- [Security & Settings](/workspace/artifacts/tpm-phase7-settings-security.png)
- [1060×620 iframe](/workspace/artifacts/tpm-phase7-iframe.png)
- [Protected access fallback](/workspace/artifacts/tpm-phase7-access-fallback.png)

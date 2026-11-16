# Phase 6 — Production readiness and dual data integration

Branch: `feat/phase-6-production-data`, based on completed Phase 5 `a177e1f`. All development and screenshots use synthetic records and a synthetic identity provider. No merge, public deployment, company credential, live Rentvine request, production synchronization or message sending is included.

## Result

The existing TPM interface now supports a complete manual CSV route through Data & Settings, independently of Rentvine API approval. All six sections use the selected Demo/CSV work-order workspace; this intentionally supersedes Phase 5's independent Overview demo. Existing page filters, domain formulas, source-qualified evidence, copy-only drafts and navy/tropical desktop design are preserved. Vendor/property datasets retain independent provenance and require verified same-account scoped IDs for joins; no names or fictional rows fill operational gaps.

### Fully implemented and tested locally

- Manual work-order, vendor and property imports with explicit actual-header/enum mapping, normalization, preview, bounded UTF-8 inputs, duplicate/missing-ID rejection, safe invalid optional-field handling and original mapped values preserved server-only. Unmapped cells are discarded. No native Rentvine export headers are asserted.
- Approved source profiles, snapshot/upsert policy, actor-bound expiring previews, source/dataset revision checks, transactional commits, idempotent replay and rollback on validation/storage failure. Full snapshots archive absent rows; upsert retains disclosed last-known rows without claiming new observations/comparable history. Retention cannot be extended for an unobserved carried record merely by importing a fresh batch. Mixed historical copies containing expired rows are discarded; fresh current rows remain.
- Durable encrypted SQLite payloads with stable scoped IDs, normalized record updates/archives, original mapped cells, source/settings, observations, successful import/check times, safe import errors, basic audit and configurable retention. Source freshness remains distinct from receipt/check time. Receipt/audit display uses Mexico City; CSV calculations retain declared source timezone.
- A protected Node 24 same-origin server, signed OIDC code/PKCE/JWKS/state/nonce/issuer/audience/expiry verification, immutable-subject role allowlist, administrator/viewer enforcement, session-bound CSRF and exact Origin checks, logout, no-store headers and default denied framing. App assets and API data require authentication on the production entrypoint. Vendor email/phone is withheld server-side for viewers. Auth loss removes cached operational data even while Demo is selected. No operational browser storage exists.
- An optional private filesystem delivered-file processor with saved reviewed mapping, source approval, two explicit activation gates, bounded reads/private permissions/symlink rejection, processing interval, safe failures and the same import pipeline. It processes already-delivered CSV files; it does not generate reports or call Rentvine. Production gates remain off.
- Data & Settings utility outside the six main tabs: source selection/approval, import administration, dataset health/history, aging/follow-up/review/timezone/freshness/retention configuration, safe audit, disabled API mode and secure setup instructions. Existing local fictional/redacted memory-only evaluation remains available without operational authorization.

### Implemented but requiring company/operator configuration

Approved OIDC provider/client and immutable staff role allowlist; secret mounts and durable protected storage/backup; HTTPS reverse proxy; actual export mapping/privacy/account/scope/timezone/retention policy; exact portal ancestor origins; separately authorized filesystem producer/inbox and processing schedule. All protected functionality is tested using local synthetic identities and data, not a company tenant. Use [CSV-only setup](docs/CSV_ONLY.md) and [deployment/security guide](docs/DEPLOYMENT.md).

### Blocked pending authorization or external evidence

**Rentvine API remains Not configured.** Its typed server-only adapter rejects activation. Public documentation requests were blocked (403) in this environment, so **no API capabilities, endpoints, authentication, native fields, pagination, quotas or permissions are verified**. Ownership approval and current official evidence are prerequisites. No live credentials were requested/generated/activated and no live API request was made. [API route](docs/API_ROUTE.md) lists the evidence and implementation steps required after approval.

No actual hosting platform/company identity tenant/Google Site has been selected, configured or verified here. Protected Google Sites identity/cookies/ancestor-chain behavior, TLS termination, backups and production access policy remain external verification steps. A local iframe test is not portal certification. Default denied framing and application authentication must not be weakened to solve embedding problems.

### Planned but not implemented

Cloud/email report delivery, Rentvine report generation, multiple scheduled datasets per source, durable external job queues, multi-instance storage, automatic PII redaction, per-property/multi-tenant access, credential rotation/migration tooling, identity-provider-wide continuous revocation, live Rentvine reader, financial ingestion, appointment feeds, verified ratings and numerical vendor quality scoring.

## Architecture and security limits

Browser → HTTPS proxy → loopback protected Node service → encrypted SQLite on private durable disk. One server instance is supported. AES-256-GCM protects payloads with random nonces and namespace/ID binding; opaque entry keys/timestamps remain database metadata. The storage key is a separate private operator mount; host disk/backups/key recovery are operator responsibilities. Original mapped values never return as raw rows to staff clients. No credential input, permissive CORS, proxy identity bypass or Rentvine write route exists.

Production sessions last eight hours absolutely, with Secure/HttpOnly/SameSite=None cookies and re-evaluated local roles. Role allowlist changes require restart; external identity revocation is not continuously synchronized. The client checks managed access periodically (60 seconds) and when selecting/refreshing sources; revocation does not erase already viewed information from a staff member's memory/screenshots. The policy assumes authorized single-firm staff access, with vendor contacts further restricted to administrators; it is not field-level tenant/property authorization.

Framing defaults to `frame-ancestors 'none'`/X-Frame-Options DENY. Exact reviewed HTTPS ancestor origins may be configured; no wildcard. Browsers may still block third-party cookies; use authenticated top-level access if the actual iframe cannot work securely. Local synthetic HTTP testing uses explicit loopback-only non-production configuration. The test identity provider and ephemeral keys are excluded from the production entrypoint/bundle.

Imported summaries/addresses/vendor contacts need approved minimization; there is no automatic redaction engine. Input permissions/attestation do not replace company privacy approval. CSV-only operation is API-independent but requires its own operational data authorization. Failed inbox files and external backups need a separate operator cleanup policy. The application never deletes or updates a Rentvine record.

## Verification

- `npm run build`: passed strict client/server TypeScript and production client/server bundles on Node 24.22.1.
- `npm run lint`: passed, with generated server output correctly excluded from source linting.
- `npm test`: **133 passed across 20 files**, including 20 server persistence/security cases. Coverage includes original calculations/interactions, source composition/property imports, encrypted restart persistence, original-value isolation, duplicates/unknowns, replay/stale/foreign previews, snapshot archives/upsert, transactional storage-failure rollback, retention (including carried-row expiry), delivered-file authorization/permissions/symlinks, signed mock OIDC claims, anonymous/header-forgery denial, role/CSRF enforcement, logout and framing/cookie policies.
- `npm run test:e2e`: **128 passed** — 32 each in Chrome at 1366/1440/1920px and Edge at 1440px. Includes original Phase 1–5 regressions and five new Phase 6 workflows per target: all-six source selection, three-report CSV imports, duplicate/replay safety, configuration/reload persistence, real HTTP viewer contact masking/write denial, authentication loss while Demo is selected, keyboard/WCAG checks and a local 1060×620 iframe.
- Production dependency audit: **0 vulnerabilities** (`npm audit --omit=dev --audit-level=high`). This excludes development dependencies and is not a complete security audit.
- Credential-pattern scan: no matched private-key/common live-key patterns in application/server/tests and bundles. Production server excludes the synthetic identity-provider entrypoint; client bundle excludes server secret configuration/OIDC implementation. This is a bounded automated scan, not proof that arbitrary source text is free of sensitive information.
- Unconfigured built-server startup: exited with status 1 and a generic configuration error; no operational service started.
- `git diff --check`: passed. No real portal/identity provider/hosting/live API or public deployment was tested.

After retention hardening and refreshed normalized-preview capture, the focused Phase 6 matrix also passed **20/20** across the same four targets. Final copy/timezone-only presentation adjustments passed build/lint; the desktop administrator workflow was repeated to capture their final screenshots. Automated checks are useful evidence, not an independent security audit or production certification.

## Review artifacts and operating instructions

- [Data & Settings desktop viewport](/workspace/artifacts/tpm-phase6-data-settings-viewport.png)
- [Data & Settings full page](/workspace/artifacts/tpm-phase6-data-settings.png)
- [CSV normalized preview](/workspace/artifacts/tpm-phase6-csv-preview.png)
- [CSV demonstration and synthetic test headers](docs/CSV_DEMO.md)
- [CSV-only operating guide](docs/CSV_ONLY.md)
- [Security/deployment and Google Sites instructions](docs/DEPLOYMENT.md)
- [API setup after approval](docs/API_ROUTE.md)
- [Four-category verification status](docs/VERIFICATION_STATUS.md)

Screenshots are outside Git and contain only explicitly synthetic data. Source, all eight source-of-truth documents, configuration templates, tests and guides are prepared for feature-branch review.

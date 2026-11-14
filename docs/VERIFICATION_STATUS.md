# Phase 6 implementation status

## Fully implemented and tested locally

Unified Demo/CSV source behavior across all six workspaces; a Data & Settings utility; explicit work-order/vendor/property CSV mappings and previews; stable-ID/enum/date validation; duplicate rejection/idempotency; snapshot versus disclosed incremental upsert; protected source approval; encrypted SQLite persistence; original mapped values retained server-only; record archives and import/audit history; safe failed/stale-preview/storage rollback; retention; separate dataset freshness/check times; OIDC code/PKCE/JWKS/nonce authentication tested with a synthetic provider; server-enforced administrator/viewer roles, CSRF, logout, contact masking and exact-origin framing policy. Prior phases' relevant functionality remains tested, with Overview intentionally changed to follow the unified source as required by Phase 6.

## Implemented but requiring operator/company configuration

Actual identity-provider client, immutable staff subject allowlist, server-only storage/identity secret mounts, reviewed report mappings/audience/timezone/retention, durable protected disk and backups, HTTPS host and exact portal ancestor origins. The optional filesystem CSV delivery worker and processing intervals require BOTH a server operator gate/private inbox and an approved administrator mapping/schedule. All production ingestion gates remain off in this development task.

## Blocked pending authorization or external evidence

Rentvine API activation, authentication/endpoints/native maintenance fields/pagination/quotas/read scopes; actual Rentvine automatic report generation/delivery; real identity/hosting/Google Sites session/cookie/framing certification. Public documentation fetches were blocked, so no verified Rentvine API capabilities are claimed. API mode is disabled server-side, not a fake working client. Ownership approval is still required; manual CSV does not depend on it.

## Planned but not implemented

Cloud-storage/email attachment connectors, multi-instance persistence, durable external job queues/multiple scheduled datasets per source, automated PII redaction, per-property/multi-tenant access policies, credential rotation/migration tooling, identity-provider-wide continuous revocation, live API adapter, accounting integration, financial ingestion/analytics, appointment feeds, verified ratings and numerical vendor quality methodology. Existing financial interfaces remain preparation only.

No public deployment, live production data, company credentials, automated messages, Rentvine writes or main-branch merge are included.

# Architecture

## Separation of responsibilities
React + TypeScript + Tailwind frontend → normalized repository interface → selected adapter (synthetic fixture, CSV, optional server-side Rentvine). Domain selectors and business rules are independent of adapters and UI. GitHub holds source and sanitized fixtures only. Use a protected hosting environment for operational data; a public static demo may contain synthetic data only.

Proposed code organization: src/app (routing/layout), src/components, src/features (one directory per tab), src/domain (types/rules/selectors), src/data (repository/adapters/validation), src/config (public validated settings), and server/ (authentication, authorization, persistence and future source integration). This is a proposed layout; the documentation package does not contain an application scaffold.

## Repository contract
Define getSnapshot(), getDataHealth(), previewImport(input, mapping, scope), commitImport(previewId), and getComparableChanges(snapshotId). These are internal application method names, not HTTP routes or Rentvine endpoints. Imports are available only to authorized importers. All adapters return DATA_SCHEMA.md contracts and capability/coverage metadata. UI never parses raw Rentvine payloads or contains source credentials. Capability gaps produce unavailable states rather than guessed values.

## CSV release
For isolated local evaluation, synthetic or approved redacted CSV data may be parsed in memory with explicit session-only persistence. A shared operational deployment needs authenticated server-side validation, protected storage, importer authorization, and current/previous snapshots. Do not persist sensitive CSVs in localStorage, public assets, service-worker caches, Git history, build artifacts, or analytics tools. Choose and document retention and cleanup before enabling real data. Stage imports atomically; protect against simultaneous commits with version checks.

## Optional Rentvine integration
Do not enable until official current documentation and account access establish the required read operations, authentication, field availability, pagination, limits, and permitted scopes. Do not invent endpoint paths or reuse administrator/integration credentials. Use a dedicated least-privilege read-only identity with account-owner approval; if suitable permissions are unavailable, remain on CSV. The server allowlists verified read operations and fields, rejects arbitrary proxy URLs/methods, handles pagination, bounded retries/backoff, rate limits, and refresh failures, and sanitizes payloads before storage. Browser code cannot call Rentvine directly with credentials. API responses pass the same normalization and rule validation as CSV.

## Protected Google Sites embedding
Google Sites is a portal, not an authorization boundary for the embedded app. Authenticate and authorize each app/data request independently, including when the app URL is opened directly. Restrict Sites membership as an additional layer. Choose a hosting/auth provider that supports the required protected iframe behavior; do not assume Google Sites supplies user identity to the app.

Use HTTPS, role-based access (viewer, importer, administrator), minimal sessions, and server-side authorization. Configure CSP frame-ancestors for the verified portal ancestor origins after testing the real embed chain; never use a blanket wildcard. Align host framing headers without weakening unrelated protections. Use exact CORS origins only where needed; CORS is not authentication. Protect stateful import/config actions against CSRF.

Test third-party-cookie restrictions, login redirects, session expiry, logout, and mobile in the actual iframe. Keep credentials/tokens out of URLs, postMessage payloads, and localStorage. Validate postMessage origins if resizing is implemented. If protected iframe authentication cannot work reliably, provide an authenticated “Open dashboard” link instead; never make data public to force embedding.

## Security and privacy
Restrict vendor contact details by role and minimize tenant information. Do not collect tenant contact details or access codes for this product. Redact free text before preview/storage. Use transport and storage encryption, audit imports/configuration without raw payloads, validate file sizes/content, escape displayed values, and allowlist external Rentvine links by verified HTTPS host. Logs, errors, telemetry, screenshots, fixtures, and tests must be sanitized. Do not install session-replay tools that capture operational data.

Ignore .env and local overrides (except .env.example), real imports, snapshots, and sensitive artifacts in Git. Use secret scanning; rotate exposed credentials using the responsible account administrator. Store operational secrets in hosting secret management. Never place a secret in a VITE_ variable: those are public build-time values. Authorization cannot depend on hiding frontend controls.

## Verification and deployment
Use focused domain tests for boundaries, unknowns, date precision, comparison scope, and disappearance behavior; adapter tests for mapping, duplicate keys, idempotency and rollback; UI checks for filter reconciliation, navigation and accessibility; security checks for direct anonymous data access, role boundaries and credential absence in client builds. Run responsive checks on desktop/tablet/mobile and embedded/direct views. Release with synthetic smoke data first, then approved data. Keep rollback to the prior app release and successful snapshot, and surface adapter failures without replacing data with zeros.

## Configuration boundary
.env.example is an illustrative future scaffold contract, not an active integration. VITE_ values are public build settings. Server variables are read only by server configuration, validated at startup and never serialized to the client. Keep rule values in a versioned validated configuration object shared by server/domain clients; environment values may seed it. Fail operational startup on missing required timezone/access settings. Auth provider, storage, source mappings, retention, exact brand values, and API configuration remain explicit implementation decisions.

# Operator runbook — prepared artifacts only

The recommended managed architecture and unverified planning budgets are in [HOSTING_OPTIONS.md](../docs/HOSTING_OPTIONS.md). These steps are for an approved operator after company review; no purchase, deploy, domain/client setup, secret generation, synchronization or Site publication is performed here.

## Managed hosting path

1. Obtain approvals, exact app host, Google client/subject roles, protected storage/key custody and backup policy from [PRODUCTION_CHECKLIST.md](../docs/PRODUCTION_CHECKLIST.md).
2. Use a single always-on paid web service with private durable local disk; confirm current provider features/pricing/permissions first. Disable automatic deploy on push/PR until controlled review. No provider blueprint or webhook is installed by this phase.
3. Build the prepared multi-stage [Dockerfile](../Dockerfile), which pins Node 24's base image digest, compiles the existing React/Vite and Node server, installs only runtime dependencies in the final stage and runs as non-root `node` (UID 1000). It excludes test identity/services and build-time CA material. Confirm image/OS vulnerabilities and digest update policy before approval. Alternatively verify a native Node 24 runtime and use `npm ci && npm run build`, then `npm start`.
4. Mount the persistent volume at `TPM_DATA_DIRECTORY`; default `/var/lib/tpm-command-center`. It must be owned/writable by the service user and 0700, with database 0600. If a provider's volume mounts as root, use its reviewed volume provisioning/ownership mechanism **before** starting the non-root app. Do not run the dashboard as root or make data/keys world-readable to work around the mount.
5. Supply the server-only configuration and private 0400/0600 file mounts from [server/.env.google.example](../server/.env.google.example). File permission checks apply to key, role allowlist and identity secret. If provider-mounted secret files are too permissive or immutable, use an approved private tmpfs/file materialization mechanism with 0700 directory/0600 files before process start; keep raw secrets out of image layers/logs. Otherwise choose a host that supports the required mounts. No insecure fallback exists in the app.
6. Container/PaaS ingress needs explicit `TPM_BIND_ADDRESS=0.0.0.0`; the Docker image supplies it. Set the platform port as needed and final exact HTTPS origin. The app always authenticates assets/API behind the platform TLS proxy. `/healthz` is a data-free process readiness route, not an authorization/data/backup certification. Preserve application security/cache/framing headers.
7. Keep exactly one instance and persistent disk on restarts/redeploys. Disable sleeping/free tiers and parallel autoscaling. Schedule small maintenance windows if disk-based releases are not zero-downtime. Validate encrypted database persistence and key continuity in a synthetic restart drill.
8. Complete top-level Google and actual portal tests before using operational CSVs. Keep manual CSV as the operating route, API unavailable and delivered-file processing `false`/unset until separate authorization. Future read-only Rentvine work stays behind its disabled adapter.

Docker build/run instructions are for controlled local/operator testing, not registry publication:

```bash
docker build -t tpm-maintenance:review .
```

On a managed development machine with an injected CA, follow that environment's supported temporary BuildKit CA-secret method; never disable TLS verification or bake session CA/proxy secrets into this Dockerfile/runtime. The reviewed task used a temporary Dockerfile differing only in CA mounts/strict TLS flags for npm install steps.

## Single VM alternative

1. Use an approved maintained Linux host, a dedicated non-root `tpm` account, Node 24, a local durable private disk and a maintained HTTPS reverse proxy. Restrict inbound traffic to HTTPS plus approved administrator access; port 8787 stays loopback. Patch/monitor OS and proxy under an assigned owner.
2. In a reviewed release directory under `/opt/tpm/releases/REVIEWED_REVISION`, run `npm ci`, `npm run build`, then retain runtime dependencies via `npm prune --omit=dev`. Include `dist`, `build-server`, runtime `node_modules` and package metadata. No test services or private source report belongs in served assets. Point `/opt/tpm/current` at the reviewed release only during the controlled change.
3. Provision `/var/lib/tpm-command-center` and `/etc/tpm` privately for the service. Install approved server settings/roles and secret mounts outside the web root; verify file ownership/mode. Choose `TPM_BIND_ADDRESS=127.0.0.1` and `PORT=8787`.
4. Review [tpm.service.example](tpm.service.example): confirm actual Node binary path/service account, read-only release permissions, writable private StateDirectory and systemd hardening on the selected OS. It is **not installed or enabled** here. Secrets must be readable by the service, not by other staff/system users.
5. Review [Caddyfile.example](Caddyfile.example), replace the reserved host only after DNS/HTTPS approval and confirm proxy syntax/version. It proxies the entire protected application/API/auth flow without stripping headers or adding CORS/frame bypasses. Callback query logging is deliberately not enabled. Obtain/renew certificates through the approved host process; do not run these placeholder templates against a public host.
6. Use the production acceptance checklist and actual Site/browser tests, then obtain the final go-ahead before switching traffic. Service manager/proxy templates require host-specific validation; they have not been installed on an actual TPM VM.

## Consistent encrypted backups and restore

The built `backup.mjs` uses Node's SQLite online backup API against a read-only source connection. It copies ciphertext coherently while the service is open, requires private source/destination permissions, refuses source overwrite/existing destinations, publishes a complete 0600 file and does not log paths/source values. It has no HTTP endpoint and does not require or copy the storage key. It removes session/login/stage namespaces **in the backup only**, so a restore cannot revive old logged-out sessions or uncommitted previews; staff must sign in/revalidate.

After approval, an operator runs from the release directory with the service's filesystem permissions:

```bash
# The operator must create/own a 0700 backup directory first.
node build-server/backup.mjs /var/lib/tpm-command-center/tpm.sqlite /var/lib/tpm-command-center/backups/approved-backup.sqlite
```

Use a fresh timestamped operator filename for each run (user-facing schedules/logs use Mexico City). No backup schedule is enabled here. Copy encrypted backups through an approved off-host encrypted backup system; keeping a copy on the same volume alone is not disaster recovery. Keep key recovery separately protected. Enforce approved backup retention and access, including deletion after policy expiry; application retention cannot purge external copies. Source configurations/imports/audit persist, but the backup intentionally excludes ephemeral auth/staging state.

For a controlled restore: stop the app; retain the failed encrypted database/key/build for investigation; verify the reviewed backup and matching recovery key in an isolated recovery environment; restore the database under correct private ownership; start one instance; require fresh staff sign-in; test authorized/unauthorized access, dataset counts, history, configuration, no live sync and API gates; record the drill and operator approval. Never restore over a running SQLite process, overwrite a key casually or point recovery at live Rentvine. The exact host/off-host recovery procedure remains an operator acceptance test. Local automated tests prove ciphertext backup/restore and session exclusion with synthetic records only.

## Rollback and maintenance

Take an approved backup before release/config/schema changes. Preserve the prior reviewed build and key continuity; deploy during an agreed window. A rollback must use a schema-compatible build/database pair and fresh sessions. No schema migration is introduced in Phase 7, but Phase 6 sessions require new sign-in because provider/domain binding was added. Monitor only safe event/status/count outcomes, disk capacity, readiness, failed imports and backup success. Do not record CSV bodies, contact details, cookies, OAuth codes/tokens or raw provider responses.

Remove staff by updating the private subject list and restarting in a controlled change; role checks apply to every request. Google-wide continuous revocation, multiple service instances, automatic cloud/email ingestion, high availability, external databases and Rentvine reads/writes are not implemented. Assign an operator for patching and restore drills even on a managed host.

After a reviewed local image build, run `scripts/test-container.sh YOUR_LOCAL_IMAGE_TAG` to repeat the synthetic runtime smoke: no root user, test provider/source directories absent, startup fails closed without configuration, private synthetic mounts start the real server, root gate contains no records, APIs/assets deny anonymous access and framing/no-store stay strict. The test container has no outbound network or published ports and is removed afterward. This does not test a real identity provider, durable hosted mount, TLS proxy or Google Site.

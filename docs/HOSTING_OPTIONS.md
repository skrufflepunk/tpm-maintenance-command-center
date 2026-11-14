# Hosting recommendation and planning costs — Phase 7

The Google Sites Team Portal stays the main interface. The app needs a small HTTPS **embedding service**, not a second portal or marketing website. Its direct URL shows only a data-free staff access screen until independently authenticated. Authorized top-level dashboard access is the fallback for blocked iframe cookies.

## Recommendation

Prefer **one always-on paid Render web service with a private persistent disk**, using the prepared Node 24 container (or a verified Node 24 native runtime), Google Workspace OIDC and the existing encrypted SQLite store. Budget **US$30–50/month** before tax, existing Workspace licensing and operator labor. This is a planning estimate, not a verified current quote. A small managed service avoids most VM patch/TLS work while keeping the current framework and storage adapter. Do not use a free/sleeping tier or an ephemeral filesystem for operational data.

**This recommendation is conditional:** before buying or deploying, verify the selected plan's current Node/container support, persistent disk ownership/permissions/encryption, backup/restore tools, secrets/file mounts, outbound Google connectivity, idle behavior, single-instance policy, HTTPS/custom domain, CSP preservation and actual embedded session behavior. The environment blocked provider documentation with 403; no provider feature or quote was live-verified here. There is no automatic platform provisioning or deployment configuration in this repository.

| Option | Estimated monthly budget (USD) | Fits current implementation? | Operational limits |
| --- | --- | --- | --- |
| Render paid web service + ~10 GB persistent disk + backup allowance | **$30–50** (roughly $25–35 compute + $2–5 disk + $3–10 backup/DNS allowance) | Yes, if protected persistent disk and private secret-file ownership are verified; Node 24/container and explicit bind supported by this release | Single instance; disk can prevent zero-downtime/parallel deploys. Backups, recovery key and platform permission checks still need an owner. No sleeping/free instance. |
| DigitalOcean or comparable small Linux VM, ~2 GB RAM, disk and backups | **$15–30** (roughly $10–18 VM + $5–12 backup/storage/DNS) | Yes; existing loopback Node server + Caddy/systemd templates | TPM/operator owns OS patching, firewall, TLS renewal monitoring, disk capacity and recovery. More administration than managed hosting. |
| Google Compute Engine small VM + durable disk/IP/snapshots | **$25–45** (roughly $15–25 compute + $10–20 disk/IP/backup) | Yes; same single-VM architecture; integrates with an approved Google Cloud organization | GCP billing/IAM/patching/backup management is still required; existing Workspace does not supply this compute free. Region and egress affect cost. |
| Cloud Run / serverless frontend + external managed database | **$50–150+** depending on database/runtime minimums and traffic | **Not as-is.** HTTP framework fits, but local SQLite cannot rely on an ephemeral container or shared network filesystem | Requires reviewed persistence adapter/migration and separate scheduler architecture. Setting max instances to one does not make ephemeral storage durable. Avoid for this phase. |

These deliberately rounded budgets are engineering planning allowances, not current published rates or commitments. Domain registration, tax, support, backup bandwidth, incident response and data growth may add costs. Existing Workspace subscription cost is excluded. Obtain an approved quote and data-processing/region agreement before provisioning. Start with one instance; measure synthetic/approved data volume before increasing capacity. No high availability or multi-region guarantee is implemented.

## Required architecture

Staff browser inside restricted Google Sites → exact HTTPS app origin → protected Node 24 app/API → AES-256-GCM payload storage in private SQLite on durable local disk. Google OIDC code/PKCE sign-in happens in a top-level tab. Explicit immutable subjects determine administrator/viewer access; verified Workspace domain and email verification are additional requirements in the Google profile.

The service can be internet reachable for staff browsers while **data remains private behind application authorization**. This is not an anonymous dashboard publication. If TPM policy requires network-private connectivity too, add an approved staff VPN/access layer and verify every staff browser can reach it; Google Sites does not proxy private app traffic. Do not assume requests come from Google's server IPs. Do not expose port 8787 directly on a VM.

Persist the database directory; keep the long-lived encryption key in a separate secret mount/recovery process. Recreating a container must not regenerate the storage key or lose the disk. Keep one writer instance and local-disk SQLite semantics. Use the tested operator backup tool before changes and a separately protected, retention-controlled copy of its encrypted output. Database ciphertext backups do not contain the recovery key. Node readiness does not certify database restore, company authorization or portal compatibility.

The existing optional delivered-file processor can run in the always-on service when separately approved, mapped and configured. It stays disabled. No Rentvine report generation, live API, cloud/email connector or automatic communication is enabled.

## Reference links for operator confirmation

- [Render pricing](https://render.com/pricing), [persistent disks](https://render.com/docs/disks), [secret files](https://render.com/docs/configure-environment-variables), [web services](https://render.com/docs/web-services).
- [DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets).
- [Google Compute Engine pricing](https://cloud.google.com/compute/vm-instance-pricing), [Cloud Run pricing](https://cloud.google.com/run/pricing).

Attempted reference access on November 14, 2026 (Mexico City date) was blocked by the managed network's destination policy. These links are supplied for review; they are not citations to pages retrieved during this task. See [operator runbook](../ops/README.md), [Google setup](GOOGLE_WORKSPACE.md) and [production checklist](PRODUCTION_CHECKLIST.md).

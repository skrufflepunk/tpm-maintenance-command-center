# Controlled deployment, secrets and security checklist

Nothing in this checklist authorizes purchase, account configuration, live credentials, Site publication, real report upload or deployment by the assistant. Use it for the final TPM/operator review. Keep passwords, OAuth secrets, API keys, raw tokens, real reports and private staff identifiers out of chat and Git.

## TPM information/approvals needed

- [ ] Select/approve hosting provider, plan, region, monthly budget and billing/operator owner.
- [ ] Approve final app HTTPS hostname/DNS/TLS and confirm whether application-authenticated internet reachability is acceptable or a staff VPN is also required.
- [ ] Confirm approved Google Workspace domain, company-owned Cloud/OAuth project, administrator who can configure the Internal audience/client, and app-access/MFA policies.
- [ ] Identify explicitly authorized staff and their administrator/viewer roles; establish verified immutable subjects securely, including the first administrator and recovery owner. Do not send them through this chat.
- [ ] Have a portal editor verify the actual published Google Sites ancestor chain and allowed dimensions; approve exact framing origins and authenticated-tab fallback.
- [ ] Approve actual CSV field minimization/redaction, account/ID namespaces, status mappings/report scope, source timezone, retention, audit/contact access and freshness/follow-up policies.
- [ ] Assign backup/recovery/key custody, off-host backup destination/retention, monitoring and incident/patch responsibilities; perform a restore drill.
- [ ] Obtain a separate explicit deployment go-ahead after the synthetic hosted acceptance record is reviewed. Rentvine API ownership approval remains separate and unnecessary for CSV-only use.

## Server environment and secret mounts

Use [server/.env.example](../server/.env.example) or the prepared [Google profile](../server/.env.google.example), stored outside Git with private permissions. Docker's image contains no operator configuration/secret files. All `VITE_` values are public; none may contain operational data, OAuth/storage/Rentvine secrets or a session token.

| Setting / file | Required handling |
| --- | --- |
| `NODE_ENV` | `production`; loopback HTTP development bypass is forbidden in production. |
| `TPM_APP_ORIGIN` | Exact final HTTPS origin, no path/query/credentials/wildcard. OAuth callback must match it exactly. |
| `PORT`, `TPM_BIND_ADDRESS` | Valid 1–65535 port; default loopback `127.0.0.1` behind VM proxy. Explicit `0.0.0.0` only behind protected platform/container ingress. Never expose a VM's internal port directly. |
| `TPM_AUTH_PROVIDER` | `oidc` or approved `google_workspace`; the latter requires canonical Google issuer/domain and a confidential web-client secret mount. |
| `TPM_GOOGLE_WORKSPACE_DOMAIN` | Exact reviewed lowercase organization domain only in Google mode; no email-suffix authorization or wildcard. |
| `TPM_OIDC_ISSUER`, `TPM_OIDC_CLIENT_ID` | Approved provider/client; no made-up registration. Issuer/discovery must match signed tokens. Client ID is public metadata but stays in server config. |
| `TPM_OIDC_ALLOWED_ORIGINS` | Only verified discovery/authorization/token/JWKS HTTPS origins; no redirect escape or blanket network access. |
| `TPM_OIDC_CLIENT_SECRET_FILE` | Private server-readable 0400/0600 regular file. Nonempty required in Google web-client mode. No secret entry in browser. |
| `TPM_USERS_FILE` | Private 0400/0600 JSON immutable subject → role allowlist, outside repo/web root. Startup rejects unsafe permissions/roles. Reload via controlled restart after membership changes. |
| `TPM_STORAGE_KEY_FILE` | Private 0400/0600 file with the separately approved 32-byte key encoded in base64. Generate only through the approved operator process, once; never regenerate on restart. Keep separate recovery custody. |
| `TPM_DATA_DIRECTORY` | Durable private local disk/directory (0700), service ownership, SQLite file 0600; one instance. Check mount ownership before switching traffic. |
| `TPM_FRAME_ANCESTORS` | Empty = denied. Only reviewed exact HTTPS ancestor origins; no wildcard/path. Do not override CSP at proxy/CDN. |
| `TPM_ALLOW_SCHEDULED_CSV`, `TPM_CSV_INBOX` | Default `false` / unset. Enable only after approved delivery process, private inbox and reviewed source schedule/mapping. This does not generate Rentvine reports. |

No Rentvine credential/endpoint/enable variable is supported. The adapter remains disabled. Retention/source settings are administrator-only server data, not public environment configuration.

## Security acceptance

- [ ] Only HTTPS ingress is exposed; internal listener/firewall and platform access are reviewed. No public Vite/preview or unauthenticated app bundle/data endpoint.
- [ ] Signed Google claims, exact hosted domain, email verification AND explicit subject authorization are enforced. Provider/domain changes invalidate prior sessions. No trusted email/role/proxy headers.
- [ ] Administrator/viewer API rules, contact masking, exact Origin+session-bound CSRF, logout/expiry and staff removal verified on the actual host.
- [ ] Cookies remain Secure/HttpOnly/SameSite=None and `__Host-` in production. No URL/storage token workaround. Google global logout/continuous revocation is not claimed.
- [ ] CSP ancestor denial/allowlist, script restrictions, no-store, nosniff, no-referrer, HSTS and absent permissive CORS confirmed from final HTTPS responses.
- [ ] The two access gates contain no data or credentials; they do not start IdP redirects inside a frame. Data/API checks remain independent of Site visibility.
- [ ] Source reports are approved/minimized; unknown fields remain unknown; unrelated/demo sources cannot join. Automated PII redaction/per-property authorization is not implemented.
- [ ] App/database/log/backup/secret file permissions and provider disk encryption/access are reviewed. Request bodies, tokens, callback query strings and raw rows are not logged by proxies/monitoring.
- [ ] Encrypted consistent backup and restore tested with separate recovery key. Backup tool excludes sessions/login attempts/staged imports, preventing session resurrection. Off-host backup cleanup follows its approved policy.
- [ ] Base image/OS and all package dependencies audited/scanned; locked versions/digest reviewed and patched under a defined cadence. Local npm audit is not an OS/container vulnerability audit.
- [ ] Durable disk survives restart/release; previous build plus encrypted backup/key can be recovered. No multi-instance/shared-filesystem SQLite deployment.
- [ ] Actual Google Site/browser acceptance checklist in [GOOGLE_SITES.md](GOOGLE_SITES.md) signed off with synthetic/redacted data before operational records.
- [ ] API, automatic delivery, message sending and Rentvine writes remain off. Drafts stay editable/copy-only.

## Activation decision

The code and local test evidence prepare a controlled deployment. They do not substitute for company authorization, verified current hosting/Google configuration, a real portal/cookie test or operational recovery ownership. Document any failed hosted check and keep data inaccessible until resolved; use the authenticated-tab fallback where embedding is prohibited. Do not collect secrets in chat to resolve these prerequisites.

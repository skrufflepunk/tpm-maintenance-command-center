# Approved Google Workspace authentication setup

This is a preparation guide. No OAuth project/client, real identity provider, password, company secret or staff account is configured by this task. Official Google reference access was blocked by environment policy; the standard OIDC implementation is tested with a synthetic signed provider, not a company Google tenant. An authorized Workspace/Cloud administrator must verify current Google Console wording, metadata and organizational policy before activation.

## Identity and permission model

The restricted Google Site remains the main interface, but does not authorize the app. The app checks signed OIDC issuer/audience/state/nonce/expiry and PKCE, then an exact server-managed immutable `sub` → administrator/viewer allowlist. In the `google_workspace` profile it additionally requires the signed `hd` claim to equal the approved Workspace domain and `email_verified` to be true. An email suffix, OAuth `hd` request hint or Site membership alone cannot grant access. A same-domain user not on the subject allowlist is denied.

Only `openid email` scopes are requested for this Google profile. No Gmail, Directory, Drive, Rentvine, accounting or maintenance write scope is requested. Email is checked as verified but is not used as the role key, stored as a contact or returned to the UI by this authentication flow. The generic Phase 6 `oidc` profile keeps its original `openid` scope and independent provider configuration.

## Administrator steps after approval

1. TPM approves the app owner, exact Workspace primary/authorized domain, staff membership list and at least one administrator/recovery owner. Do not send passwords, client secrets, API keys, raw identity tokens or real reports through chat or Git.
2. Select the company-owned Google Cloud project associated with the approved Workspace organization. In Google Auth Platform / OAuth consent configuration, use an **Internal** audience if available for that organization, provide required company-owned app information and approve the minimal scopes. This configuration is not an app authorization allowlist; retain the server subject list. Have the Workspace administrator review OAuth app-access controls, MFA and any policy that could block this client.
3. Create an approved **Web application** OAuth client. Register exactly `https://APPROVED_APP_HOST/auth/callback` as an authorized redirect URI, with no wildcard, token or arbitrary return URL. Sign-in is server-side: no browser OAuth client secret or JavaScript sign-in integration is needed. Decide development/staging clients separately; never reuse a production secret in synthetic tests.
4. Store the generated web client secret through the approved server secret system. Mount it as a private readable file (0400/0600). The app's `TPM_OIDC_CLIENT_SECRET_FILE` points to the file; the secret value never belongs in a `VITE_` setting, UI, image, URL, repository or chat. A Google web-client profile without a protected nonempty client-secret file fails startup.
5. Verify the canonical issuer's discovery at `https://accounts.google.com/.well-known/openid-configuration` from the approved host. Inspect authorization/token/JWKS origins, signing algorithms and client authentication methods. Configure `TPM_OIDC_ALLOWED_ORIGINS` with only those verified exact HTTPS origins. The prepared example includes commonly used Google origins, but must be checked against actual current discovery. Do not hand-code maintenance/API endpoints or follow redirects to unapproved origins.
6. Copy [server/.env.google.example](../server/.env.google.example) into a protected operator location. Set `TPM_AUTH_PROVIDER=google_workspace`, exact approved lowercase `TPM_GOOGLE_WORKSPACE_DOMAIN`, canonical issuer `https://accounts.google.com`, approved client ID/origin, protected mounts, durable disk and private role allowlist. Placeholders are reserved examples, not TPM's actual host/domain/client. Framing remains denied until portal review.
7. Provision reviewed immutable Google `sub` identifiers through the administrator's controlled, verified identity onboarding process. The first administrator's identifier must be established securely before access is allowed; do not temporarily authorize a whole domain, accept browser headers or log raw tokens to bootstrap. Obtain `sub` from a verified Google identity assertion using the approved client/provider tooling, not a guessed employee number or email. Record subject → role in the private JSON allowlist:

   ```json
   {
     "replace-with-reviewed-google-subject": "administrator",
     "replace-with-another-reviewed-google-subject": "viewer"
   }
   ```

   Real subject values/allowlist files stay outside Git and chat. An already authorized staff member can inspect their own subject in the authenticated `/api/bootstrap` response through approved administrator tooling; it contains no raw Google token. The UI has no self-registration or domain-wide auto-enrollment.
8. On an approved host, validate with synthetic/redacted data: listed administrator; listed viewer; unlisted same-domain account; wrong-domain account; personal Google account; expired/wrong-audience/nonce token; logout; staff removal; direct URL/API access. An unauthorized user must receive no maintenance dataset, import controls or vendor contact fields.
9. Finish the Google Sites/cookie checks in [GOOGLE_SITES.md](GOOGLE_SITES.md) before allowing real operational records. Keep top-level access available if embedded cookies fail. No security header/cookie downgrade is an acceptable workaround.

## Session and removal policy

Production session cookies remain `__Host-…; Secure; HttpOnly; SameSite=None; Path=/`, with an eight-hour absolute lifetime and server-side revocation on logout. OIDC state uses a short-lived Lax cookie for top-level authorization. The app requests account selection in Google mode; it never starts Google authorization inside a frame. The data-free gate opens a new tab and lets staff return/reload the Team Portal.

Subject roles are re-evaluated on every API/app request from the configured server allowlist. Removing/changing a staff entry requires a controlled service restart because the file is loaded at startup. Changing provider/domain invalidates prior sessions; Phase 6 sessions also require a fresh sign-in after this upgrade. Existing encrypted data is retained. To revoke all sessions in an incident, use the approved encrypted-store operational procedure; do not casually rotate/drop the storage key and lose records. Identity-provider-wide continuous revocation and Google global logout are not implemented. Signing out of the dashboard does **not** sign out of Google; the signed-out gate does not immediately restart SSO.

The client periodically rechecks managed access and clears cached operational datasets on authentication failure. This does not erase already viewed information, clipboard copies or screenshots. Staff are authorized firm-wide; per-property/multi-tenant policies remain unimplemented. Vendor email/phone is restricted to administrators server-side. Confirm retention and allowed report fields separately from identity approval.

Reference for administrator verification: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect). No live compatibility or company configuration is claimed until those hosted checks pass.

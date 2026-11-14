# Google Sites embedding — operator and portal editor steps

The existing restricted TPM Team Portal remains the team's interface. The HTTPS dashboard host is its protected embedding backend, not a new portal. Only a data-free staff access gate is anonymous; app assets and every maintenance API still require the application's own staff session.

No Site or hosting change is performed by this phase. Local tests exercise a 1060×620 synthetic frame, not a real Google Site. Google documentation was blocked by managed network policy; an authorized editor must confirm current interface wording and the actual ancestor chain/browser policy.

## Before editing the Site

1. Obtain the hosting/identity/data-handling approvals in [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md). Configure the protected server and [Google Workspace sign-in](GOOGLE_WORKSPACE.md). Use synthetic/redacted reports for first acceptance.
2. Confirm the final exact HTTPS dashboard URL, such as the reserved example `https://maintenance.example.invalid/`. Use the approved real host only after configuration. Never embed a Vite development/preview URL, storage-file URL, token, password, report identifier or secret.
3. Test its direct URL while signed out: only the access gate may appear. `/api/bootstrap`, data endpoints and app JavaScript must return unauthorized; a Google Sites restriction alone does not protect them. Verify listed administrator/viewer and unlisted/wrong-domain users.
4. In browser developer tools, inspect the actual published portal/embedded frame ancestor origins, including any intermediate frame. Record each exact HTTPS origin. Do not copy an origin from this example as evidence; Google/custom domains can differ.
5. Set `TPM_FRAME_ANCESTORS` to the reviewed comma-separated exact HTTPS origins. Default empty means denied. No wildcard, path, credentials or blanket `*.google.com`/`*.googleusercontent.com` is allowed. Restart through the approved operator process. Verify the app's **response** CSP contains only this list and no proxy adds conflicting X-Frame-Options. The server omits X-Frame-Options only when a specific allowlist is configured. CSP still evaluates every ancestor; a private path on a shared origin is not a separate framing boundary.

## Embed by URL

After the operator's controlled HTTPS deployment is approved and available:

1. Open the existing TPM Team Portal in Google Sites edit mode with an authorized editor account.
2. Navigate to the intended maintenance page in that Site. Use **Insert → Embed → By URL**, paste the approved HTTPS root dashboard URL, then choose **Insert**. Do not use a script tag, public report share, credential-bearing URL or duplicate standalone portal.
3. Expand the section/embedded component to the widest practical desktop content width. Prefer **1060px or more actual frame content width**, and **800–1000px height** where the Site allows it. Site gutters make content narrower than the outer browser. The local acceptance floor is 1060×620; short frames still scroll vertically. Avoid a tiny fixed-height card. No cross-origin resize script or broad `postMessage` permission is needed.
4. Preview at desktop widths, then have the authorized editor perform the Site's normal controlled internal publication process only after approval. The assistant does not publish. Keep the existing Google Workspace team restrictions on both viewing and editing the Site.
5. Test the **published internal Site**, not only its editor preview: Google may use a different ancestor chain between preview and published views. Re-review exact origins rather than weakening CSP if a frame is blocked.

## Staff sign-in and fallback

- On first load or after expiration, the frame displays the data-free TPM access screen. Choose **Open staff sign-in in a new tab**, use the approved Workspace account, then return to the Team Portal and choose **Reload this dashboard**. Authorization is deliberately not redirected through Google inside an iframe.
- When embedded cookies work, use the dashboard normally inside the Site. The full-height sidebar stays in the frame and pages use normal document scrolling. Data & Settings has four keyboard-operable sections. Dialogs retain focus containment, Escape and focus return.
- The embedded dashboard includes **Open dashboard in a secure tab**. If the browser blocks third-party cookies or hosted identity cannot work in the frame, continue with this authenticated view of the same dashboard. Keep the Team Portal as the launch point. No second portal or alternate data feed is created.
- New-tab links use `noopener noreferrer` and the configured app origin; there are no URL tokens or arbitrary return URLs. A browser may require a user click for popups.
- Sign out revokes the dashboard session and shows a signed-out gate without immediately restarting SSO. It does not globally sign out of Google. Other open views lose protected API access and clear managed data on their next access check; already displayed information/clipboard copies cannot be recalled.

If fallback sign-in succeeds but the frame keeps asking for a session, this may be browser cookie policy, not failed credentials. Do not remove Secure/HttpOnly, switch to public APIs, pass tokens in the URL, add `Access-Control-Allow-Origin: *`, loosen ancestor origins or proxy staff identity headers. Use the authenticated tab and report the browser/policy to the operator.

## Hosted acceptance record required before real data

Record browser/version, actual app and ancestor origins, user role/account outcome, test time in Mexico City and pass/fail for:

- Chrome/Edge at 1366/1440/1920 desktop and actual Site content dimensions.
- Default framing denial; only approved ancestors permitted; unapproved-origin framing denied.
- Initial/new-tab sign-in, embedded reload, refresh/back, third-party-cookie blocking and fallback.
- Session expiration, sign-out in one tab, another frame's denied requests, provider/domain changes and staff removal.
- Anonymous direct URLs and every API; viewer administrative denials and contact masking; unlisted same-domain and personal Google accounts denied.
- CSV import/rollback/reload persistence, actual successful-load times, data health/source switching and disabled automation/API gates.
- All six navigation destinations, long-page scrolling/sidebar, four settings sections, native dialogs/keyboard/200% zoom and no unnecessary page-wide horizontal overflow.
- HTTPS/reverse-proxy headers, no cache of protected data, no query/credential logging, protected disk/secret access and a real backup/restore drill.

A local pass is not a hosted certification. If the Site cannot embed this application under TPM's browser/security rules, the authenticated new-tab fallback is the supported result. The maintained CSV route does not depend on Rentvine API approval.

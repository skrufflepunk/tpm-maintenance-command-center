# Embed the static edition in the existing Google Site

The Google Site remains the user's launch point. The embedded app is a free static GitHub Pages site with **no authentication or server**. Google Sites viewing restrictions **do not protect** the Pages app/direct URL. Do not paste reports, JSON backups, tokens or credentials into the Site, repository or embed URL.

## Steps after the owner manually publishes

1. Complete [the Pages/security review](DEPLOYMENT.md) and its explicit manual publish action. Obtain the actual HTTPS `page_url` from GitHub, generally `https://OWNER.github.io/REPOSITORY/`.
2. Open the existing Team Portal in Google Sites edit mode with the authorized editor account. Navigate to the maintenance page.
3. Choose **Insert → Embed → By URL**, paste the exact published project URL (with trailing slash), and choose **Insert**. Do not use a development URL, raw CSV/backup link, GitHub source/blob page, Actions artifact URL, token or iframe credential workaround.
4. Expand the component to the widest practical desktop area. Aim for **1060px or more actual iframe width** and **800–1000px height**; Site gutters make the frame narrower than the outer browser. The local constrained acceptance fixture uses 1060×620. The dashboard fills its frame, keeps its sidebar fixed to that frame and uses normal vertical document scrolling. Wide register tables retain labeled scrolling only where needed.
5. Preview, then use the Site editor's normal controlled publication process when the owner approves. This task does not edit/publish the Site or Pages. Check the actual published internal Site, since editor preview and published browser policies can differ.
6. Confirm all six sections, filters/charts/details, Settings tabs, import previews and Escape/focus return in dialogs with synthetic data.

## Local data inside an iframe

The browser stores imported data in IndexedDB for the app's origin and storage partition; it is **not stored in Google Sites, GitHub, Rentvine or a shared team database**. Browser privacy policies may give the iframe a different partition than the same app in a top-level tab, and site-data clearing/private mode/eviction can remove it. Do not assume imports automatically appear in both locations or on another browser/device.

The UI reports whether saving works. If storage is blocked, it runs in **temporary mode** with an explicit warning; imports still function in memory, but reload loses them. Use **Open dashboard in a new tab**, then import there or transfer a private JSON backup with **Local Data & Backups**. A top-level tab is the same dashboard, not another portal. There are no sign-in cookies, OAuth redirects or Storage Access permission prompts in this edition.

Downloads/clipboard may also be restricted by the Site/browser. If backup downloads or copying drafts is blocked, use the new-tab view and existing manual-copy guidance. Never work around this by uploading backups to a public repository/URL, embedding them in query parameters or claiming the Site authenticates the app. Export regularly and keep downloaded files private; they are unencrypted.

## Published acceptance checks

After manual publication, use synthetic data to record results for desktop Chrome/Edge:

- The actual Pages URL loads anonymously with fictional defaults; no backend or Google sign-in is requested.
- All assets work at the repository path; hash navigation/reload keep the app usable.
- Published Google Site permits the embed and does not impose a framing/sandbox policy that prevents app scripts or local storage. This cannot be proven before a real publication test; GitHub Pages custom security headers are not configurable by this app's HTML.
- Frame width/vertical scroll/fixed sidebar, keyboard tab navigation, dialogs, chart/table filters and source isolation work.
- Import, reload, backup export, clear and validated restore work in the intended frame partition; blocked-storage mode is explicit.
- New-tab fallback works, and separate partition data is transferred by local backup if needed.
- A clean browser profile sees no other profile's imports. No private file is present in served assets or repository history.

Local automated tests use a built production bundle under a project subpath and an iframe on a different loopback origin. They verify layout, imports, storage, dialogs and new-tab behavior, **not a real Google Site or live GitHub Pages deployment**. If the real portal blocks storage/downloads, the supported result is the same free dashboard in a new tab. Server-enforced access control requires the separately preserved Phase 7 edition.

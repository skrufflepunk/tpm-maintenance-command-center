# Free GitHub Pages deployment — manual only

No website is published by this task. The delivered artifact is a single-user static app, not the Phase 7 protected service. **Pages is public hosting; Google Sites restrictions do not protect its URL.** Read [the security checklist](PRODUCTION_CHECKLIST.md) before changing repository visibility or publishing.

## Prerequisites and $0 assumptions

- A GitHub account and eligible **public repository** on GitHub Free, standard GitHub-hosted Linux Actions and the free `OWNER.github.io` project URL. No paid server, database, custom domain, OAuth client or Rentvine key is needed. Confirm current account/Pages/Actions limits; avoid paid runners or optional paid services. A private repository may require a paid plan for Pages.
- Review all repository contents **and history** for secrets/private records before making it public. The app publishes source code and synthetic fixtures. This task's bounded source/build scan is not a certification of arbitrary historical content. If in doubt, use a new clean public static-only repository and keep the original server repository private.
- Preserve the server edition first: this workspace already has `archive/phase-7-server` and `feat/phase-7-sites-readiness` at `1f8a0e1`. An approved owner can push the archive/static branch to the intended remotes. No push, merge, visibility change or deployment is done automatically here.

## Review the static artifact

From the Phase 8 checkout:

```bash
npm ci
npm run build
npm run lint
npm test
npm run test:e2e
npm run test:pages
npm audit --audit-level=high
```

`dist/` is the **only** hosting artifact: `index.html`, an original favicon, hashed JS/CSS assets and empty `.nojekyll`. Relative URLs work at `/REPOSITORY/` as well as a root site. Navigation uses hashes, so no server rewrite or SPA backend is needed. The static CSP blocks connections/forms/plugins; no backend/API/auth code or report files are permitted by the artifact guard. A meta CSP cannot enforce `frame-ancestors` and does not authenticate users or isolate same-origin sibling apps. No service worker, analytics or third-party runtime asset is installed.

Development/test HTTP servers are local verification fixtures, not deployment requirements. Node 24 is required for building, not for visitors or Pages hosting. Only synthetic CSVs are used in tests. Test outputs, exported backups, local databases and operator files must never be copied into `dist` or uploaded manually.

## Activate the prepared Actions workflow after review

1. Choose the reviewed public static repository. Push only approved code/history; do not upload reports or backups. If using the original repository, keep the Phase 7 archive branch available and have the owner review visibility implications first.
2. Ensure `.github/workflows/pages.yml` is present on the repository's **default branch**. GitHub's manual dispatch UI requires a workflow on the default branch. Merely pushing a new workflow on a feature branch may not display **Run workflow**. After review, the owner can adopt the static branch as the default or deliberately merge/copy the reviewed static edition through their normal process. The assistant does not merge or change the default branch.
3. In **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**. Review the `github-pages` environment's allowed deployment branches and, where available/appropriate, approval protection. A one-user repository may need to allow the owner to approve their own run; do not configure an impossible second-reviewer requirement. No app secrets or OAuth credentials belong in repository/environment variables.
4. Open **Actions → Review and publish static Pages edition → Run workflow**. Select the reviewed static ref. Leave **publish unchecked** to run a review-only build. It runs build/artifact checks, lint, unit tests, dependency audit and production project-path/iframe browser tests with synthetic data. No Pages artifact/configuration/deployment is created in review-only mode.
5. Inspect the passing run and static security review. When the owner is ready to publish, manually run it again with **publish checked** and **confirm_public_hosting = `PUBLISH`** exactly. Any missing/mismatched confirmation fails before publishing. There are no push, pull-request, schedule or release triggers.
6. The publish run must pass the same checks. Only then is `dist/` uploaded using the Pages artifact action, followed by a separate deployment job with `pages: write`/`id-token: write` and the `github-pages` environment. The review job has only contents/Pages read permissions. Checkout credentials are not persisted. Action versions are pinned to upstream tag SHAs; review them under normal dependency maintenance.
7. Read the successful deployment job's `page_url` output / **Settings → Pages** to obtain the exact URL. The usual project form is `https://OWNER.github.io/REPOSITORY/`; use GitHub's actual result, not the application development server or an Actions artifact URL. Keep the trailing slash and HTTPS. A newly published visitor sees fictional demo data, not anyone else's browser imports.
8. Test directly with a clean browser profile and then perform the Google Sites acceptance steps below. Use synthetic records for this first published verification. No deployment occurred here, so GitHub-hosted workflow/environment behavior is not claimed as tested.

## Updates, rollback and data continuity

Pushes alone never deploy. Repeat the manual review/publish sequence for a reviewed update. Keep a known-good Git commit and export a local backup before changing app origin/path or updating the local schema. Browsers store data by origin/partition/path; a new project URL/profile can appear empty. Use JSON export/restore to transfer. The same-domain path namespace is organizational only, not a security boundary.

To roll back, have the owner manually dispatch the reviewed older compatible static ref through the same checks. Do not disable schema/integrity validation to load an unsupported backup. There is no paid server to maintain, but browser/software dependencies and repository access still need normal updates. GitHub plan/usage policies and real Site acceptance remain owner responsibilities.

Continue with [Google Sites embedding](GOOGLE_SITES.md) and [browser data/backup instructions](CSV_ONLY.md). The [preserved server edition](https://github.com/skrufflepunk/tpm-maintenance-command-center/tree/archive/phase-7-server) remains a separate option if server authentication is needed later; that branch is only remotely reachable after the owner pushes it.

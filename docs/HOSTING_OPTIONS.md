# Phase 8 hosting choice — GitHub Pages

The selected edition targets **$0/month hosting** using an eligible GitHub Free **public** repository, standard Actions, Pages and the free `github.io` URL. It needs no always-on backend, hosted database, paid service, OAuth client or custom domain. Confirm the owner's current GitHub eligibility/usage limits; private-repository Pages, paid runners or optional domains can change that cost assumption. No plan purchase, repository visibility change or deployment occurs in this task.

GitHub Pages is public hosting. Google Sites restrictions do not protect the app/source/demo or its direct URL. The app processes manual reports only in the browser and does not upload records or backups. IndexedDB and JSON files are local, unencrypted and not shared across devices; browser quota, profile/site-data clearing and iframe partition policies apply. Use a dedicated trusted origin/profile and protect backups. A project path is not an origin security boundary.

Only reviewed static dist assets are published by a manually confirmed workflow. See [Pages instructions](DEPLOYMENT.md), [Site integration](GOOGLE_SITES.md), [security review](PRODUCTION_CHECKLIST.md) and [data operations](CSV_ONLY.md). No live Pages/Site endpoint has been created/tested here; local production-bundle fixtures cover project paths and cross-origin embedding.

The prior paid/server hosting analysis remains unchanged on `archive/phase-7-server` at `1f8a0e1` and is **not a dependency or recommendation for this static edition**. Use that branch only if server authorization/shared encrypted storage is required later.

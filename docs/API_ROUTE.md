# API status — static edition

Live Rentvine API access is unavailable in the free static edition. There is no secure server credential store, endpoint, API toggle, OAuth client or synchronization process here. Do not add a token to frontend JavaScript, a VITE_ variable, browser storage or an embed URL. Manual work-order/vendor/property CSV imports remain fully usable without API approval.

The unchanged Phase 7 server edition is preserved at `1f8a0e1` on `archive/phase-7-server` and `feat/phase-7-sites-readiness`. Its approval-gated typed adapter and secure server foundation remain available there. Read its original guide with `git show archive/phase-7-server:docs/API_ROUTE.md` after reviewing the desired edition. No ownership approval, live API capability, endpoint or credential is invented/activated by this task.

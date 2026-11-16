# Google Workspace status — static edition

There is **no Google Workspace sign-in or role enforcement** in the GitHub Pages edition. Google Sites team restrictions do not protect the Pages URL or authenticate its application code. A frontend password/domain check would not supply server authorization and is intentionally absent.

The Site can remain restricted as the user's launch point, while the static app/source/demo are public. Imports remain in that browser profile/partition and are not uploaded by the app; local data and backups are unencrypted. Follow [the static Sites guide](GOOGLE_SITES.md) and [local data guide](CSV_ONLY.md).

For actual server-enforced Workspace authorization, use the unchanged Phase 7 branch at `1f8a0e1`. Its original configuration guide is available via `git show archive/phase-7-server:docs/GOOGLE_WORKSPACE.md`. No Google OAuth client or live credentials are created/configured in Phase 8.

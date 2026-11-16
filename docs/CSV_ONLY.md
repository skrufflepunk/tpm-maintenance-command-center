# Browser-only CSV and local backup guide

No API access or backend is needed. The static app processes files locally, keeps explicitly mapped columns only and never changes Rentvine. It has no automatic report generation/delivery, scheduled ingestion, cloud sync or server role/audit system.

1. Open **Data & Settings → Imports & History**, **Work Orders → Import CSV**, or **Vendors → Import vendor CSV**. Supply only approved minimized/redacted records; omit tenant contacts, access codes, free-form private notes and unnecessary contact fields.
2. Upload separate work-order, vendor and property reports. Limits are 2 MiB/file, 10,000 rows, 100 columns, and 500 characters per mapped cell. UTF-8, quoted commas/quotes/newlines and BOM are supported. No exact Rentvine-native header is assumed.
3. Declare account, report scope/comparison key and IANA timezone; supply a real offset report-as-of timestamp only if available. Omission stays Unknown with a disclosed receipt-time fallback. Map actual headers and enum values. Stable source ID is required; names never create joins. Confirm ID namespace relationships before joining vendor/property directories.
4. Validate and inspect preview/coverage/errors. Missing/duplicate IDs, malformed rows, reused mappings and ambiguous structure reject the candidate. Optional invalid dates/statuses remain Unknown with coverage. Nothing is loaded until the validated commit button is used.
5. Load the report. IndexedDB transactions save it before the UI claims success. Failed/quota/stale-tab writes retain prior successful data. Repeat mapped content/config does not create duplicate records or a new comparable observation. Loading replaces the current observed snapshot; the compatible prior report remains separate evidence, never silently restored into totals or inferred closed/deleted. The static edition supports snapshot replacement, not the archived server edition's upsert/archive policy.
6. Import the other datasets with the same account. Vendor/property-only workspaces do not borrow demo work orders. All six pages use the chosen Demo/CSV mode with independent page filters. Switch to Demo without mixing records.
7. Check receipt/source time, coverage and local import history. Up to 50 accepted/replay entries and two work-order/vendor observations are retained; this is editable local metadata, not an immutable activity/audit feed.

## Storage and backups

The complete workspace is limited to 12 MiB of serialized UTF-8 state. Browser quota/policy may be lower. IndexedDB is scoped by origin/partition and this app's path namespace. Other apps on the same `OWNER.github.io` origin can access origin storage; a repository path is not an access-control boundary. Local data is unencrypted; use a trusted browser profile/origin and protect the device.

Under **Local Data & Backups**:

- **Export local backup** downloads versioned JSON containing mapped report text/options, receipt/observation metadata, rules, review settings, source choice and local history. No arbitrary unmapped columns, drafts, credentials or remote URL are added. The file is private data, not a deployable asset.
- **Restore local backup** requires a local JSON file. Size/format/checksum/schema/account/rules/CSV validation runs before preview and explicit replacement confirmation. Unknown fields, duplicate IDs, corrupt content or unsupported versions cannot bypass validation by supplying a recomputed checksum. A checksum detects accidental corruption, not authenticity; the user can edit/recompute a local file, so no signature or server trust is claimed.
- **Clear local data** requires confirmation and resets reports, prior observations, history, rules/settings and the current view. It replaces the workspace slot with an empty generation marker/default state so stale tabs cannot silently overwrite it. Other open tabs in the same partition are notified when BroadcastChannel is supported; without it, reload them. Unrelated apps/keys are untouched. Downloads, other partitions/profiles/devices and forensic disk copies are not erased by the app.

Corrupt saved data is left untouched until explicit clear/restore. Storage denial leads to temporary mode rather than a broken app; export before closing and try a top-level tab. Clearing in temporary mode cannot remove inaccessible browser partitions; use browser site-data controls for those. Export before changing browser/profile/origin/app path, clearing site data or upgrading the schema. No automatic backup or indefinite durability is promised.

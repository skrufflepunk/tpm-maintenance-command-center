# CSV-only operating route

CSV is a complete independent source route. No Rentvine API approval, account API token, financial permission or automatic report generation is required. Real operational use still requires the authenticated server, approved data handling/mappings and protected storage described in [DEPLOYMENT.md](DEPLOYMENT.md).

## Manual reports

1. Build/configure the protected server and sign in as an allowlisted administrator. Open the sidebar's **Data & Settings** utility. The six main workspaces remain Overview, Work Orders, Action Center, Vendors, Properties and Analytics.
2. Create an approved CSV source with a descriptive label, verified account identifier, workspace scope and reviewed IANA source timezone. Confirm that its fields/audience are approved. This approval does not authorize the API.
3. Choose an explicit default behavior:
   - **Snapshot:** current observations become the supplied report. Rows absent from a partial/latest report remain in encrypted archives and prior evidence; they are not deleted from Rentvine or inferred closed. Current dashboard totals use the latest observed set.
   - **Incremental upsert:** supplied stable IDs update their complete normalized rows, other IDs retain last-known values. Carried rows are disclosed as not observed in the latest batch. A carried active state is last known, not newly confirmed. Upsert requires compatible verified account/scope/mapping semantics; establish a reviewed snapshot baseline or separate source before changing those semantics. Incomplete optional fields on a supplied row remain unknown, not guessed from an older row. Comparable no-change/backlog history is withheld for incremental state rather than pretending carried rows are fresh observations.
4. Select the CSV source, then open **Imports & History** and import work orders, vendors and/or properties separately. All six pages use this mode. A vendor/property-only source can list supplied directory entities but cannot invent work-order workload.
5. Upload UTF-8 comma-separated data (2 MiB / 10,000 rows, 100 columns, 500 mapped-cell characters). Inspect actual headers and map only approved fields. No Rentvine-native header is assumed. Work orders require a stable verified work-order ID; vendors require Vendor ID; properties require a stable Property ID. Names never create joins.
6. Review each enum mapping, source account/timezone, dataset scope and optional source-as-of timestamp. Missing source time stays Unknown with a labeled receipt-time fallback; no timestamp is invented. Confirm identifier namespace compatibility before joining vendor/property directories to work-order references. Contacts are restricted to administrators; no tenant/owner contact, note, credential or access-code field is mapped.
7. Validate and review normalized rows, warnings, missing IDs and carried counts. Duplicate/missing IDs, structural ambiguity or bad required mapping reject the candidate. Invalid optional fields become unknown with warnings. Rejections and stale/foreign/expired previews cannot replace the last successful data.
8. Commit the validated report. Encrypted persistence holds the normalized data, original **mapped** field values, source configuration, import/audit history and retained observations. Unmapped fields are discarded. The original values are server-only and are not returned to staff as raw rows. Exact file/config replay is idempotent; it updates a successful check time without duplicating records/history or changing source timestamps.
9. Review Data Health/import history, each report's separate as-of/receipt times and configured freshness policy. A successful check does not make an old source report fresh. Switch to Demo to view only the unchanged fictional fixture. Operational selections can survive reload within the signed-in server session; no data/token is saved in browser storage.

## Optional automatic processing after delivery

Implemented delivery path: a protected server-side filesystem inbox. Cloud storage and email attachment connectors are not implemented. Rentvine automatic report generation/delivery is unverified and not activated.

After separate operator authorization:

- Successfully import the dataset manually to establish its reviewed mapping preset.
- Configure an approved, private inbox root outside the web root and Git. Source-specific directories are `<inbox>/<source UUID>/<workOrders|vendors|properties>`, with directory mode 0700 and files mode 0600. Symlinks and unsafe permissions are rejected. Producers must be approved and restricted; do not point the inbox at arbitrary shared uploads.
- Deliver a complete UTF-8 file using a temporary name, then atomically rename it to an allowed `*.ready.csv` basename after writing is finished. This is delivery by your approved process, not generation by Rentvine.
- The operator sets `TPM_CSV_INBOX` and explicitly enables `TPM_ALLOW_SCHEDULED_CSV=true`. An administrator must separately enable the source/dataset processing schedule with a 5–10,080 minute interval. Both gates default off. Neither was enabled for production during this development task.
- The worker scans only the configured source folder using the saved reviewed mapping, processes at most 10 ready files per source per pass, and applies the same preview/validation/transaction/idempotency path. Successfully persisted files are removed from the inbox after encrypted source values are stored. Failed files remain for operator review; safe failures/audit metadata contain no raw rows or filenames. Avoid leaving failed files indefinitely: operator handling of inbox failures is outside database retention and needs an approved cleanup policy.
- The app timer checks the stored processing schedule; it does not request a report from Rentvine. If there is no supported delivery/generation process, continue simple manual upload indefinitely.

The current implementation supports a single processing dataset per source schedule. Multiple independent schedules or external durable job queues require future work; manual import still supports all three dataset types in one source. No automatic messages or source write operations occur.

Retention also removes expired last-known carried rows when fresh incremental batches arrive. Mixed historical copies containing expired rows are discarded to avoid preserving expired fields; fresh current rows remain available. Retention changes current coverage to partial and invalidates stale previews/replay identity where records were removed.

Phase 7 places source approval/selection under **Data Sources**, report mapping/health/history under **Imports & History**, disabled delivery/API setup under **Automation**, and rules/retention/audit/access under **Security & Settings**. It preserves the complete protected CSV route. See [controlled deployment](PRODUCTION_CHECKLIST.md).

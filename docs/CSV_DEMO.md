# Synthetic CSV import demonstration

The automated browser demonstration uses only synthetic records and a local mock OIDC provider. It does not sign in to a company account or access Rentvine.

```bash
npm ci
npm run build
npm test
npm run test:e2e -- --project=desktop tests/phase6.spec.ts
```

Playwright starts a Vite UI plus the explicitly synthetic loopback test services. The test-only identity provider generates ephemeral signing keys and offers synthetic administrator/viewer identities. It is not imported into the production server bundle and must never be used for operational access. Service data lives in a private temporary test directory and is cleaned up on shutdown.

The demonstration:

1. Uploads an explicitly mapped local work-order CSV, vendor directory and property master without requiring the protected server route; these are memory-only fictional/redacted evaluation data.
2. Signs in through the mock provider as an administrator and creates an approved **synthetic** persistent CSV source.
3. Uploads a report with the illustrative test headers below. These are test headers, not verified Rentvine export names:

   ```csv
   ID,Number,State,PropertyID,Property,Vendor,Created,Completed,UnmappedNotes
   w1,SYNTH-P6-101,Open,p1,Synthetic Operations Court,v1,2026-11-01,,MUST NOT IMPORT
   w2,SYNTH-P6-102,Completed,p1,Synthetic Operations Court,v1,2026-11-01,2026-11-05,MUST NOT IMPORT
   ```

4. Maps stable IDs, status, supplied property/vendor references and dates; explicitly maps `Open`/`Completed`. The unmapped notes column is discarded. Source report time is explicitly supplied by the synthetic fixture.
5. Previews and commits the normalized report to encrypted server storage, then separately imports a verified synthetic vendor directory and property master including a zero-workload property.
6. Rejects a duplicate work-order ID candidate without changing current data, replays the original report without duplication, records import/audit history, changes an administrator configuration and verifies persistence after browser reload.
7. Verifies Overview and the other workspaces use the same CSV set, with no demo names inserted into operational views.
8. Signs in as a synthetic viewer, verifies CSV viewing but denies administrative writes and withholds vendor contact values in the actual HTTP payload, then revokes logout sessions.
9. Tests loss of authentication even while Demo is active, removing cached managed CSV data before it can be selected again without authorization.
10. Checks accessibility and a constrained desktop iframe. This is a local layout/authentication mock, not validation of a live Google Site or company identity tenant.

Desktop artifact captures, outside Git:

- `/workspace/artifacts/tpm-phase6-data-settings.png`
- `/workspace/artifacts/tpm-phase6-data-settings-viewport.png`
- `/workspace/artifacts/tpm-phase6-csv-preview.png`

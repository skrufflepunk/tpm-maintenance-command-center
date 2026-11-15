# Synthetic static CSV demonstration

Run `npm run build`, `npm test`, `npm run test:e2e -- --project=desktop tests/static.spec.ts`, then `npm run test:pages`. Tests use only synthetic records and local browser profiles. There is no mock identity service or application backend in this branch.

The demonstration maps two synthetic work orders plus separate vendor/property reports; discards an unmapped notes column; shows all-six source isolation and source-qualified metrics; persists reloads and rules; rejects duplicates; replays idempotently; exports a local JSON backup; confirms clear; validates/restores the backup and rejects tampering; handles blocked storage, quota failure, cross-tab clear and corrupt local state. Built Pages tests use a repository-style path and a different-origin 1060×620 iframe with new-tab fallback, not a real GitHub/Google deployment.

Illustrative **test headers, not verified Rentvine-native fields**:

```csv
ID,Number,State,PropertyID,Property,Vendor,Created,Completed,UnmappedNotes
w1,SYNTH-STATIC-101,Open,p1,Synthetic Static Court,v1,2026-11-01,,DO NOT PERSIST
w2,SYNTH-STATIC-102,Completed,p1,Synthetic Static Court,v1,2026-11-01,2026-11-05,DO NOT PERSIST
```

No actual customer/property/vendor or credential is included. Screenshots are saved outside Git under `/workspace/artifacts/tpm-phase8-*.png`; test traces/results are ignored and never uploaded to Pages. See [PHASE8_REVIEW.md](../PHASE8_REVIEW.md) for actual completed results.

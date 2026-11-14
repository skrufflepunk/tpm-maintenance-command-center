# Rentvine API route — blocked pending approval and verification

## Current facts

- Ownership has not approved live API access.
- Public documentation retrieval attempts were blocked by the environment's network policy (403). No actual Rentvine authentication scheme, endpoint, status/approval/financial field, pagination contract, quota or read permission was verified.
- `server/integrations/rentvine.ts` contains only a typed read interface and a deliberately throwing factory. There is no live client, URL proxy, API enable flag or credential-entry form. API-mode source creation is rejected server-side even for administrators. Administrator API configuration returns Not configured with setup requirements; viewers cannot access privileged configuration.
- The staff OIDC integration is application authentication, not a claim about Rentvine authentication.
- No real credentials were requested/generated/used and no live account requests were made. Synthetic OIDC test signing keys are ephemeral local fixtures, not production credentials or a Rentvine connection.

## Route after explicit approval

1. Obtain company ownership approval for the integration and exact maintenance-only read scope. Financial access requires separate authorization and source validation; do not add accounting permissions by default.
2. Obtain current official account/API documentation and verified sanitized examples. Record authentication, allowed reads, source fields, stable account-scoped IDs, relationships, date precision/timezone, enum mappings, pagination and rate-limit/retry behavior. Do not guess endpoint names or infer approval/appointments/ratings/costs from descriptions.
3. Create a dedicated least-privilege read identity through the account owner's approved process. Do not paste live secrets into this chat, frontend, Google Sites, URL, logs or `VITE_` variables. Use the hosting secret manager/protected server-only mounts after review.
4. Implement a reviewed server adapter conforming to the normalized snapshot/directory contracts. Allowlist verified reads/fields and origins, support complete pagination, bounded timeouts/backoff/quotas, safe idempotent commits and explicit field capabilities. Do not expose arbitrary proxy URLs/methods or any Rentvine writes.
5. Add verified API configuration/capability and authorization gates, then test with synthetic mock responses first. Extend source selectors only after the adapter exists. Preserve CSV as an independent supported fallback if the API is denied or unavailable.
6. Separately approve an actual refresh cadence and any production activation. Validate error/partial-report rollback, stale source reporting, duplicate IDs, missing-data coverage, access restrictions, secret absence and the real protected Google Sites flow before activation.

These steps are not silently completed by the interface. API synchronization, native field compatibility, tenant access and production scheduling remain blocked/unimplemented pending the external evidence and authorization above. CSV persistence, validation and viewing do not require them.

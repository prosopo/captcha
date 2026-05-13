---
"@prosopo/types": minor
"@prosopo/api": minor
"@prosopo/provider": minor
---

Add a new admin-only endpoint `POST /v1/prosopo/provider/admin/counters/clear-all`
for deleting per-sitekey usage counters from Redis. Intended for manual
testing of routing decision machines and staging-environment resets — not
part of the hot path.

- `ClearAllCountersBody` (optional `dapp`) and `ClearAllCountersResponse`
  (`success`, `deletedCount`, `scope`) zod schemas in `@prosopo/types`,
  plus `AdminApiPaths.ClearAllCounters` and a 10/60s rate limit.
- `UsageCounters.clearAll(dappAccount?)` in the provider, using Redis
  `SCAN` + `DEL` in 500-key batches. Returns null on Redis failure so
  callers can surface the underlying error.
- `ApiClearAllCountersEndpoint` wired through `ApiAdminRoutesProvider`.
- `ProviderApi.clearAllCounters(jwt, dappAccount?)` client method.

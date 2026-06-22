---
"@prosopo/load-balancer": minor
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/detector": minor
"@prosopo/api": patch
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/types-env": minor
"@prosopo/database": minor
"@prosopo/env": minor
"@prosopo/provider": minor
---

Replace client-side weighted-random provider selection with static DNS endpoints.

- Removed the `providerSelectEntropy` field from `DetectorResult`, `Session`, the
  Mongoose `SessionRecordSchema` (including its standalone index), and every
  call-site that threaded it through frictionless / image / pow / puzzle flows.
- Removed `FrictionlessManager.hostVerified` and its decision-machine call site
  — there's nothing to verify when the DNS layer picks the host.
- `getRandomActiveProvider(env)` now returns the per-environment static DNS
  endpoint (`pronode.prosopo.io` family) instead of fetching the provider list
  and weighted-selecting. The entropy parameter is gone.
- `getProcaptchaRandomActiveProvider` is now a thin re-export so widget packages
  keep importing from `procaptcha-common`.
- `FrontendProvider.datasetId` is dropped; `CaptchaRequestBody.datasetId` is
  optional. The server falls back to its own most-recently-uploaded dataset
  (`env.datasetId`, populated from `db.getMostRecentDatasetId()` at startup) —
  clients can't pin a dataset under DNS routing because they don't know which
  pronode they'll hit.
- Removed dead `setProviderLoader` / `prefetchProviders` / `selectWeightedProvider`
  plumbing from `@prosopo/load-balancer`. The server's cacheFile-based loader
  setup in `startProviderApi` goes with them.

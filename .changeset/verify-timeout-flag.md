---
"@prosopo/types": minor
"@prosopo/load-balancer": minor
"@prosopo/server": minor
"@prosopo/provider": patch
---

`isVerified` still answers `verified: false` when the provider or the provider list times out, and now also sets `timedOut: true` so a caller that fails open on an unanswered verify can tell a timeout from a rejection. A new optional `providerListTimeoutMs` server setting bounds the provider-list fetch, and `findProvider` / `getProviders` accept a timeout for it.

The self-hosted `/siteverify` now answers a timed-out verify with `timedOut: true` and a neutral score of 0.5 (`TIMED_OUT_VERIFY_SCORE`) instead of 0, which read as a confident human.

---
"@prosopo/load-balancer": patch
---

The provider-list fetch in `loadBalancer` now gives up after 10 seconds (overridable via a new optional third argument). `@prosopo/server` calls it on every `isVerified`, so a stalled provider-list endpoint used to hold the site owner's verification request open for the runtime's default timeout (about five minutes in Node). Browsers without `AbortSignal.timeout` keep the old unbounded behaviour.

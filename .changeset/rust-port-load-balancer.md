---
"@prosopo/load-balancer": patch
"@prosopo/types": patch
"@prosopo/util-crypto": patch
---

Add a Rust port of the load balancer's server side: the provider list (from the `PROSOPO_PROVIDER_LIST` override, the development provider or Prosopo's hosted list) and the cached lookup the provider uses to forward verifications. The Rust shared types gain `EnvironmentTypes`, and the Rust util-crypto exports its JavaScript-compatible `JSON.stringify` and key ordering. The TypeScript is unchanged.

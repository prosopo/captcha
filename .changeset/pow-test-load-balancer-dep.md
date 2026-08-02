---
"@prosopo/procaptcha-pow": patch
---

Remove the undeclared `@prosopo/load-balancer` import from the manager unit test, deriving `IpMode` from `procaptcha-common`'s `pickIpMode` instead so `lint:refs` passes.

---
"@prosopo/cli": patch
---

The provider now keeps retrying for up to five minutes when its database is not reachable at startup, instead of crashing straight away. Containers can start in any order.

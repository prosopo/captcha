---
"@prosopo/cli": patch
---

The provider now keeps retrying and logging when its database is not reachable at startup, for as long as that takes, instead of crashing. Containers can start in any order.

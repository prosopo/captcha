---
"@prosopo/util": minor
"@prosopo/api": patch
"@prosopo/load-balancer": patch
"@prosopo/provider": patch
"@prosopo/user-access-policy": patch
"@prosopo/web-bot-auth": patch
"@prosopo/procaptcha-common": patch
---

Add `joinUrl` and `stripTrailingSlashes` to `@prosopo/util` and use them instead of each package's own slash handling, so a base URL ending in `/` no longer produces a `//` path.

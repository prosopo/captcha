---
"@prosopo/database": patch
"@prosopo/env": patch
"@prosopo/redis-client": patch
"@prosopo/provider": patch
---

Bind repeated log context once with `Logger.with` instead of re-attaching the same data on every log call (mongo `mongoUrl`, redis `url`/`name`, provider startup-cleanup `failedFuncName`, and IP validation `challengeIp`/`providedIp`).

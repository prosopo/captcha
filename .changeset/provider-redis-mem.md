---
"@prosopo/database": minor
"@prosopo/provider": patch
"@prosopo/env": patch
"@prosopo/types": minor
"@prosopo/cli": minor
---

The provider can keep its session read cache (`cache:session:*`, `cache:detector:*`) in a separate, memory-only Redis set by `REDIS_MEM_CONNECTION_URL` (password `REDIS_MEM_CONNECTION_PASSWORD`, else `REDIS_CONNECTION_PASSWORD`). Access rules and usage counters stay on the main Redis. Without the new variable everything stays on the main Redis as before. The provider compose file gains the `redis-mem` service.

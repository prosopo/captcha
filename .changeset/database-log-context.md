---
"@prosopo/database": patch
---

Redis cache warnings now include the session, hash or detector session they are about. The ids were passed as top-level fields, which the logger drops, so a failing cache entry could not be traced. They now go under `data`.

`getRedisConnection` now says "Redis connection undefined" when the general Redis connection is missing, instead of naming the access-rules connection.

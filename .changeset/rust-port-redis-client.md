---
"@prosopo/redis-client": patch
---

Add a Rust port of the Redis client (`connectToRedis`, `setupRedisIndex`, `redactRedisUrl`) and of the RediSearch index bookkeeping, for the upcoming Rust provider service. An index definition hashes to the same value the TypeScript stores in `_index_hashes`, so starting the Rust service does not drop and rebuild existing indexes. The TypeScript package is unchanged.

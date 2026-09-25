---
"@prosopo/database": minor
"@prosopo/provider": patch
---

Removed the Redis session write queue. Nothing ever put a session on it, yet every provider polled Redis for it every 10 seconds, and its drain step could duplicate, drop or delete records if it had ever been used. `RedisWriteQueue` loses `queueSessionRecord`, `drainSessionRecords`, `startPeriodicFlush` and `stopPeriodicFlush`, and `Tasks.flushWriteQueue` is gone. The session read cache is unchanged.

---
"@prosopo/provider": patch
---

API rate limits are now counted in Redis, so containers sharing a Redis share one allowance per client. If Redis is unavailable or slow, each container falls back to counting in memory.

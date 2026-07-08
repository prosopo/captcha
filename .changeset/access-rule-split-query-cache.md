---
"@prosopo/provider": minor
"@prosopo/user-access-policy": minor
---

perf(access-rules): split-query hot path + verdict cache with LRU and singleflight

Reworks the block-lookup Redis path so per-request latency is bounded by matching-rules-per-request rather than total rules in the tenant. Rule populations in the 10k+ range no longer degrade tail latency.

Key changes:

- **Split-query read path**: `redisRulesSplitQuery.ts` builds one FT sub-query per populated request field (numericIp exact + CIDR, ja4Hash, userId, headHash, coords, countryCode, asn), each hitting a discriminating posting-list index instead of a single wide FT.AGGREGATE that scaled linearly in total rule count.
- **`clientId="global"` sentinel**: writer stamps the sentinel on rules with no clientId so queries probe `@clientId:{X|global|ismissing}` instead of the expensive `ismissing()` set-difference walk. Transition-safe — legacy rules match via the ismissing branch until a rehash migrates them.
- **HardBlockVerdictCache**: bounded LRU + TTL (10 s / 50k entries) with real LRU move-to-tail on hit and **singleflight `getOrCompute`** dedupe of concurrent misses — the wave-1 stampede fix for the frontend retry-loop shape.
- **Request-scoped memo**: attached to `req` so blockMiddleware + downstream in-request checks share one Redis round-trip.

Measured impact under 100-concurrent × 10-wave retry storm against a 19.3k-rule population: wave-1 p99 drops from 23 ms → 3 ms, throughput jumps from 28.5k → 61.5k req/s per process, 50 identical concurrent misses collapse to 1 storage call.

---
"@prosopo/user-access-policy": patch
"@prosopo/provider": patch
---

Deferred access rules are now fetched at verify and excluded at request time.

`deferToVerify` rules are skipped by the request-time middleware and enforced by `checkForHardBlock`, so a deferred rule is a hard block whatever its policy type. But `checkForHardBlock` fetched with `blockOnly`, which narrows the Redis pool to `@type:{block}` — a deferred `Restrict` was never fetched and so could never fire, despite `findHardBlockPolicy` being written to accept one.

`deferToVerify` is now indexed. The request-time middleware uses `@type:{block} -@deferToVerify:{true}`, so deferred rules are filtered out in Redis instead of being fetched and discarded in JS. Verify emits a second, disjoint probe set for deferred rules rather than widening the block clause — merging the two populations into one probe would make them share a single `SPLIT_MAX_CANDIDATES_PER_SUB` budget, letting a dense deferred cohort truncate hard blocks out of the candidate set. The verdict cache key includes the distinction so the two lookups can't share a result. Adding the indexed field changes the index hash, so the index is rebuilt once on startup.

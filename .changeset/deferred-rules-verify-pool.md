---
"@prosopo/user-access-policy": patch
"@prosopo/provider": patch
---

Deferred access rules are now fetched at verify and excluded at request time.

`deferToVerify` rules are skipped by the request-time middleware and enforced by `checkForHardBlock`, so a deferred rule is a hard block whatever its policy type. But `checkForHardBlock` fetched with `blockOnly`, which narrows the Redis pool to `@type:{block}` — a deferred `Restrict` was never fetched and so could never fire, despite `findHardBlockPolicy` being written to accept one.

`deferToVerify` is now indexed, and the hard-block pool is selected per caller: verify uses `(@type:{block})|(@deferToVerify:{true})`, while the request-time middleware uses `@type:{block} -@deferToVerify:{true}` so deferred rules are filtered in Redis instead of being fetched and discarded in JS. The verdict cache key includes the distinction so the two lookups can't share a result. Adding the indexed field changes the index hash, so the index is rebuilt once on startup.

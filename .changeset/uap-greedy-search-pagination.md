---
"@prosopo/user-access-policy": patch
---

Paginate the greedy `findRules` RediSearch query via `FT.AGGREGATE WITHCURSOR` so the candidate set is no longer truncated at `REDIS_BATCH_SIZE` (1000). Under high-volume bot traffic, a single popular ja4 fingerprint can be carried by thousands of rules; the OR-style greedy query returned > 1000 candidates and `FT.SEARCH`'s LIMIT silently dropped the tail — block rules emitted by less-frequent detectors sat past offset 1000 and never reached the JS-side specificity sort, letting matching requests through. Aggregation cursors return the full result set, so ranking sees every candidate.

---
"@prosopo/user-access-policy": patch
---

fix(user-access-policy): drop typeless candidates from findRulesRanked FT.AGGREGATE

`SEVERITY_EXPR = '(@type == "block")'` dereferenced `@type` directly, so any candidate document missing the `type` field caused the whole aggregate to fail with `Could not find the value for a parameter name, consider using EXISTS if applicable for type` — the catch in `findRulesRanked` swallowed the error and returned `[]`, i.e. *no* rules matched the request. In production this surfaces under two conditions: (a) a stale RediSearch index entry pointing at a hash whose `type` field has been removed (visible after mass `DEL`s or rule rewrites), and (b) a partial-write race in the writer. A `FILTER exists(@type)` step now runs before any `APPLY`, dropping the malformed candidate at the pipeline edge so the rank, sort, and limit operate only on well-formed rules. Adds two regression tests that simulate the typeless candidate by `HDEL`-ing `type` after insertion: one asserts the aggregate completes (empty result, no throw), the other asserts a co-resident valid rule still comes back.

---
"@prosopo/user-access-policy": patch
---

fix(user-access-policy): make findRulesRanked robust to typeless candidates and IPv6 numericIp

Two production-fatal bugs in `findRulesRanked`, both surfacing as `failed to execute ranked search query` with empty results — i.e. no rules match the request and a Block rule that should fire is silently skipped.

1. **Typeless candidates abort the aggregate.** `SEVERITY_EXPR = '(@type == "block")'` dereferenced `@type` directly, so any candidate document missing `type` triggered `Could not find the value for a parameter name, consider using EXISTS if applicable for type`. Sources of typeless candidates in production: stale RediSearch index entries pointing at a hash whose `type` was `HDEL`'d or whose key was `DEL`'d (visible after mass cleanups), and partial-write races in the writer. Fix: `FILTER exists(@type)` step at the start of the pipeline drops malformed candidates before any APPLY runs.

2. **`FT.AGGREGATE LOAD` returns NUMERIC fields as doubles.** RediSearch stores NUMERIC values in the index as 8-byte doubles, so any `numericIp` / `numericIpMaskMin` / `numericIpMaskMax` past `Number.MAX_SAFE_INTEGER` (every IPv6 rule) round-tripped as scientific notation (`5.59112965392e+37`) and `z.coerce.bigint()` threw `Cannot convert … to a BigInt`. The hash itself preserves the full 38-digit string. Fix: use the aggregate purely as a ranker (it returns top-N keys by spec/severity); read the field values via `HGETALL` over those keys, same pattern as `findRulesGreedy`. One extra round-trip over ≤20 keys.

Adds three regression tests: two simulate the typeless candidate via `HDEL` (single rule + co-resident valid rule), one inserts an IPv6 `numericIp` past `2**53` and asserts the bigint comes back intact. All three fail without the respective fix.

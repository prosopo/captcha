---
"@prosopo/user-access-policy": minor
"@prosopo/provider": minor
---

Server-side specificity rank for the access-rule lookup. Strict-match callers (the `blockMiddleware` and the verify-time `checkForHardBlock`) now issue one `FT.AGGREGATE` with `APPLY exists()` for specificity, `APPLY @type == "block"` for the severity tiebreak, `SORTBY @_rank DESC`, and `LIMIT 0 20`. Node receives at most 20 fully-populated rules — no follow-up HGETALL per candidate, no JS-side rank, no silent truncation past the LIMIT (which only applies after Redis has scored every candidate the strict filter returned).

Supersedes both the v3.6.38 regression (`b520cd94c` — FT.AGGREGATE WITHCURSOR materialising ~1190 hashes per request, pegged provider1 at ~125% CPU on pronode10) and the 3.6.38-hotfix1 shape that reverted to FT.SEARCH (re-opened the 1000-candidate silent-truncation bug). The greedy/admin path (`matchingFieldsOnly=false`) keeps the FT.AGGREGATE+CURSOR approach with a generous `GREEDY_MAX_CANDIDATES` cap since those callers do not run on the per-request hot path.

`packages/provider/src/api/blacklistRequestInspector.ts` flips `getPrioritisedAccessRule` to `matchingFieldsOnly: true` to engage the new path. The defensive JS `rankCandidateRules` is kept so any drift between the Redis-side score and the JS semantics surfaces as ordering, not as letting traffic through. New benchmark integration test seeds 10k rules across a realistic specificity distribution and asserts p50 < 80ms / p99 < 250ms over 200 lookups; local measurement is steady at p50 ≈ 20ms, p99 ≈ 24ms.

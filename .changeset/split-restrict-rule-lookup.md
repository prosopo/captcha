---
"@prosopo/user-access-policy": patch
"@prosopo/provider": patch
---

fix(user-access-policy): route non-block strict-match rule lookups through the split-query path

Live 2026-07-10 Twickets regression: a portal-authored Restrict/image rule scoped to `clientId + numericIp` was silently dropped from the frictionless access-policy lookup even though the rule was correctly stored in Redis and indexed. The DM then fell through to `default_pow` and served POW instead of the configured image challenge.

Root cause: the `findRulesRanked` FT.AGGREGATE ranker used for non-block lookups capped candidates at `SERVER_SIDE_RANK_TOP_N = 20` after a server-side `SORTBY @_rank`. Under Greedy matching with `matchingFieldsOnly=true`, the query is a wide OR that matches every rule missing `headHash`, `coords`, or `headersHash` — for a Twickets-shaped tenant (~860 candidates) the top 20 slots were filled by higher-specificity SIMD_REPLAY and SUDDEN_VOLUME_INCREASE Block rules that didn't actually apply to the request. The specific-IP Restrict rule (specificity 2) was pushed out; Node saw only irrelevant candidates; `rankCandidateRules` filtered them all out via `ruleApplies`; the lookup returned `[]`.

Fix: extend the existing `findBlockRulesSplit` path (previously the hot path for `blockOnly=true` callers) to cover every `matchingFieldsOnly` call. Each sub-query hits a discriminating posting list (exact numericIp, exact ja4Hash, etc.), so the ip:exact probe returns exactly the rules literally matching the request IP — the specific-IP rule can no longer be pushed off the end by irrelevant candidates from other probes. `blockOnly` is now a flag on the sub-query builder that narrows probes to `@type:{block}` when set. Split reader now sorts candidates by (specificity desc, block-first) so direct reader consumers see the same order the old FT.AGGREGATE ranker gave.

Regression coverage added:

- Unit: `buildScopedRulesSubQueries` emits/omits `@type:{block}` correctly per `blockOnly` flag and produces the same probe shape either way.
- Integration: specific-IP Restrict rule survives when 40 higher-specificity irrelevant Block rules co-exist on the same tenant (mirrors the live Twickets shape).

Benchmarks unchanged: split hot path p50=1.4ms / p99=2.2ms across 19,300 seeded rules; 100×10 concurrent storm holds ~990 req/s.

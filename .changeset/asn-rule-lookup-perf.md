---
"@prosopo/provider": minor
---

Collapse the per-request access-rule lookup from 2 × (2^n − 1) Redis `FT.SEARCH` round trips (126 with n=6 user-scope fields) to a single greedy query, with specificity ranking done in JS. Same external semantics — client-scoped rules still outrank global, and a rule with both `ja4Hash` and `ip` constraints is correctly rejected for requests that only match one of them.

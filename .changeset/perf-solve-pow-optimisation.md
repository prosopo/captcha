---
"@prosopo/util": patch
---

Optimise the `solvePoW` hot loop by removing per-iteration allocations: reuse a single message buffer and rewrite only the nonce digits in place, and replace the per-candidate 256-bit comparison with an early-exit byte check.

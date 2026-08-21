---
"@prosopo/database": patch
"@prosopo/provider": patch
"@prosopo/types-database": patch
"@prosopo/cli": patch
---

Two provider-DB latency fixes.

**Pin the pending-stage sweep to its compound partial index.** `getUnstoredDappUserCommitments`, `getUnstoredDappUserPoWCommitments`, and `getUnstoredSessionRecords` now call `.hint("pendingStage_partial")`. Observed post-index-fix on 2026-08-21: mongo's planner sometimes picked plain `IXSCAN {_id:1}` over the compound `{pendingStage:1, _id:1}` for `find({pendingStage:true}).sort({_id:1})`, scanning the whole collection and filtering in memory until the 30s socket timeout killed the connection. Clearing the plan cache re-planned once but didn't prevent recurrence after future catalog changes — the hint makes the choice explicit and permanent.

**Remove local context-entropy computation.** Deletes `sampleContextEntropy` (the `$sample`-then-`$lookup` aggregation), `setClientContextEntropy`, `ClientTaskManager.calculateClientEntropy`, and the `setClientEntropy` scheduler + CLI registration. Was accounting for ~36 minutes of DB time every 6h against `powcaptchas` and `sessions` — the `$lookup` fanned out to 10 000 session reads per invocation to produce 75 sampled sessionIds. Same computation now runs off-provider in the external job-runner across the full record set; the provider keeps `getClientContextEntropy` for the DM's read path (the job-runner writes to the same `clientcontextentropies` collection).

---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
---

Cache compiled decision-machine sandboxes; keyset-paginate the pending-stage sweep.

- `DecisionMachineRunner` now hits `vm.createContext` + `new vm.Script` at most once per source blob (keyed by SHA-256). Exports `invalidateDecisionMachineScriptCache` and `invalidateAllDecisionMachineArtifactCaches`, both called from `updateDecisionMachine` after any artifact upload.
- `getUnstoredDappUserCommitments` / `getUnstoredDappUserPoWCommitments` / `getUnstoredSessionRecords` switch from `skip(N)` pagination to keyset (`_id > afterId`). Compound partial index `{pendingStage:1, _id:1}` on all four collections so filter + sort ride one index. Fixes the sweep that was scanning 470k–1.2M docs per page under a large pending backlog.

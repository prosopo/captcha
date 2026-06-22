---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/database": patch
"@prosopo/api": patch
---

Add `DecisionMachineKind` (`routing` | `decision`) to separate routing and decision artifacts on the same provider.

- New `DecisionMachineKind` enum in `@prosopo/types`.
- `DecisionMachineArtifact` and the Mongoose `DecisionMachineArtifactRecordSchema` gain an optional `kind` field; the unique compound index becomes `(scope, dappAccount, kind)` so a routing machine and a decision machine can coexist for the same scope/dapp.
- `ProviderApi.updateDecisionMachine` accepts an optional `kind` 10th arg; the `apiUpdateDecisionMachineEndpoint` admin handler reads `decisionMachineKind` from the request body and forwards it.
- `ClientTaskManager.updateDecisionMachine` and the artifact-listing returns include `kind`.
- `ProviderDatabase.getDecisionMachineArtifact` filters by `kind` when supplied; `upsertDecisionMachineArtifact` defaults missing `kind` to `Routing` for backward compatibility on existing rows.
- `DecisionMachineRunner` keys its in-memory cache by `(scope, kind, dappAccount)` and selects the appropriate artifact for `runDecisionMachine` (kind=`decision`), `runRoutingMachine` (kind=`routing`) and `runCounterMachine` (kind=`routing`).
- `DecisionMachineArtifactRecordSchema.captchaType` enum now includes `CaptchaType.puzzle` alongside `pow`/`image`.

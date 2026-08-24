---
"@prosopo/database": patch
---

Add reusable projection-contract test scaffold for `ProviderDatabase` mongo fetch methods.

`packages/database/src/tests/integration/projectionContract.ts` exports `testProjectionContract`, a vitest helper that pins a (projection method, consumer) pair: insert a fully-populated fixture, fetch via the method under test, assert every field the consumer reads survives the projection. `packages/database/src/tests/integration/projectionContracts.integration.test.ts` wires initial contracts for `getPowCaptchaRecordByChallenge`, `getPuzzleCaptchaRecordByChallenge`, and `getClientRecord`.

Motivation: same class of bug keeps landing (`getSessionRecordBySessionId` missing tcp-probe fields — #3107; `getDappUserCommitmentBy{Id,Account}` missing verify-path fields — #3116). Mongo projections narrow at write time and stay narrow, while downstream consumers add new field reads over time; TypeScript can't catch the mismatch because the return type is the full record, not the projected subset. This scaffold pins the contract per method and fails a targeted assertion the moment a projection stops covering what the consumer reads.

Adding a new contract when a new projected fetch method lands, or extending the `consumerReads` manifest when a consumer starts reading a new field, is now the drift-prevention convention. `commitmentRecordProjection.integration.test.ts` and `sessionRecordProjection.integration.test.ts` remain as bespoke regression guards; the scaffold is additive, not a replacement.

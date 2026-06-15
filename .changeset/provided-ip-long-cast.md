---
"@prosopo/database": patch
"@prosopo/types-database": patch
---

Fix `providedIp.lower` being persisted as BSON `Long` instead of `Decimal128` on `usercommitments`, which aborted the central-streaming sweep on a `CastError` and stopped *all* records from being streamed off the affected provider node.

Three changes, each addressing one half of the regression introduced by #2681 ("lifecycle timestamps + submit→verify recency window"):

- **provider.ts** — `updateDappUserCommitment` and `updatePuzzleCaptchaRecord` now branch between pipeline-form (`updateOne(filter, [{ $set: ... }])`) and ordinary `$set`. The pipeline form bypasses Mongoose schema casting, so a `bigint` IP half lands on disk as BSON Int64 (Long) rather than going through the `bigint → string → Decimal128` setter on `CompositeIpAddressRecordSchemaObj`. The pipeline form is only used when an `$ifNull` is genuinely required; the `imgCaptchaTasks` side-update call site only carries `providedIp`/`metadata`, so it now takes the ordinary path and the setter runs.
- **captcha.ts** — `CaptchaDatabase.saveCaptchas` normalises `ipAddress` / `providedIp` composite-IP halves on each lean doc before the `bulkWrite`. `Model.bulkWrite` skips setters, so a Long-typed `lower` (whose unsigned value exceeds `Number.MAX_SAFE_INTEGER` — every IPv6 lower with bit 63 set) hits the Decimal128 caster raw and the ordered bulkWrite aborts the entire batch. Normalisation converts the Long via `Long.fromBits(low, high, /*unsigned*/ true).toString() → Decimal128`, matching what the original schema setter would have produced.
- **types-database/provider.ts** — `CompositeIpAddressRecordSchemaObj.lower/upper` setters extracted into a shared `normaliseIpHalf` that also handles BSON `Long`. Defensive cover for the `updateOne`/`save`/`create` paths the streamer uses (those *do* run setters); does not run under `bulkWrite`, which is why the captcha.ts normalisation is also needed.

Long-class checks use duck-typed `_bsontype === "Long"` rather than `instanceof Long` to stay robust against hoisting differences between the top-level `bson` import and the copy the MongoDB driver uses for deserialisation.

Regression test under `packages/database/src/tests/integration/providedIpPipelineCast.integration.test.ts` pins both halves: ordinary `$set` writes Decimal128, `saveCaptchas` drains a Long-poisoned lean doc through to a clean Decimal128 at central, and a negative-control test keeps the underlying Mongoose pipeline-cast behaviour visible so a future regression on either side is unambiguous.

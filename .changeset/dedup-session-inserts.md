---
"@prosopo/database": patch
---

Fix `CaptchaDatabase.saveCaptchas` to upsert session events by `sessionId` instead of `insertOne`, matching the pattern already used for image/pow/puzzle records in the same method. The blind insert stacked a duplicate on central every time the sweep in `clientTasks.storeCommitmentsExternal` re-drained a record that `CentralDbStreamer.streamSessionRecord` had already landed — a live snapshot showed ~64% of sessionIds in `captchastorage.sessions` had 2+ docs. Safe now that sessionIds are `pronode<N>-<uuidv4>` (cross-pronode collision impossible, same-pronode uuidv4 collision 2^-122), which wasn't the case when the original `updateOne + upsert` was swapped to `insertOne` in #1811. Added `saveCaptchasSessionUpsert.integration.test.ts` as a regression guard.

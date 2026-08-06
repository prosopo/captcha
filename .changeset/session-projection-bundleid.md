---
"@prosopo/database": patch
---

Include `bundleId` in the `getSessionRecordBySessionId` projection.

`bundleId` was added to `SessionRecordSchema` for the per-session detector pool but never added to the projection. `CaptchaManager.resolveBundleBySessionId` reads it via `getSessionRecordBySessionId` on every pow / puzzle / image submit whenever the Redis session cache misses, so the fallback returned `undefined` even though the record on disk carried a valid bundleId. Downstream `decryptBehavioralData` and `decryptSimdReadings` then dropped their payloads, so `pow.behavioralDataPacked`, `pow.deviceCapability`, and `session.simdReadings` were persisted at ~0% fleet-wide.

Regression test extends `sessionRecordProjection.integration.test.ts` to seed and read back a `bundleId`.

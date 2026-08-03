---
"@prosopo/provider": major
"@prosopo/database": major
"@prosopo/types": major
"@prosopo/types-database": major
"@prosopo/api": major
"@prosopo/cli": minor
---

chore(detector): remove the legacy detector-key rotation machinery

Nothing has read these keys since the detector moved to per-session provider
bundles — the decrypt paths resolve a bundle's own keypair instead. Rotating
them was already a no-op, so the whole surface is removed rather than left
looking live.

**Breaking — the admin API loses two endpoints:**

- `POST /v1/prosopo/provider/admin/detector/update` (`AdminApiPaths.UpdateDetectorKey`)
- `POST /v1/prosopo/provider/admin/detector/remove` (`AdminApiPaths.RemoveDetectorKey`)

Also removed: `ProviderApi.updateDetectorKey` / `.removeDetectorKey`;
`ClientTaskManager.updateDetectorKey` / `.removeDetectorKey`;
`IProviderDatabase.storeDetectorKey` / `.getDetectorKeys` / `.removeDetectorKey`;
the `detector` Mongo collection and its `DetectorRecordSchema` / `DetectorSchema`
/ `DetectorKey` types; the `UpdateDetectorKeyBody` / `RemoveDetectorKeyBodySpec`
/ `UpdateDetectorKeyResponse` API types; and the rate-limit config for both
paths.

The `detector` collection itself is left in place on existing deployments — no
migration drops it. It can be dropped manually once the pool rollout is
confirmed.

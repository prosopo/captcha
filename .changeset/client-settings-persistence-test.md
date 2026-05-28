---
"@prosopo/provider": patch
"@prosopo/types-database": patch
---

test(provider): integration test asserting every IUserSettings field round-trips through Mongo

Registers a site key with a fully-populated `IUserSettings` (every field set, including the new `storeMetadata` and the existing nested `contextAware` / `ipValidationRules` / `spamFilter` / `trafficFilter` sub-documents), reads the record back from Mongo via the real Mongoose write/read path, and asserts each top-level and nested field survived. This is the regression test class that would have caught the `autoBanScoreThreshold` Mongoose-strict-mode drop on the original PR.

While adding the test it caught another field that was in zod `ClientSettingsSchema` but missing from the Mongoose `UserSettingsSchema`: `puzzleTolerance`. The fix is bundled here — adds `puzzleTolerance: { type: Number, required: false }` to `UserSettingsSchema` so it actually persists.

---
"@prosopo/database": patch
"@prosopo/types-database": patch
---

feat(database): stream puzzle captcha records to the central captchastorage DB in real-time

Puzzle records were being written to each provider node's local mongo but never reached the central `captchastorage` DB on mongo1 — `CentralDbStreamer` only exposed `streamPow*` and `streamImage*` methods, and `provider.ts`'s `storePuzzleCaptchaRecord` / `updatePuzzleCaptchaRecordResult` / `updatePuzzleCaptchaRecord` had no streamer calls at all. As a result 35 puzzle records were successfully written to per-pronode mongos over 7d but zero landed in the central store, so portal aggregations and the audit search return no puzzle data regardless of live activity.

Adds `streamPuzzleRecord` / `streamPuzzleUpdate` on `CentralDbStreamer` mirroring the PoW pattern (fire-and-forget, `challenge` upsert key, `pendingStage` guard callback so concurrent updates aren't dropped). Wires those calls into every puzzle write/update site in `provider.ts`. Adds `puzzlecaptcha` to `CaptchaDatabase`'s tables and extends `saveCaptchas`/`getCaptchas` with a puzzle branch for parity with the existing pow/image bulk-write paths. Adds `StoredPuzzleCaptchaRecordSchema` in `@prosopo/types-database` and threads `PuzzleCaptchaRecord` through the `ICaptchaDatabase` interface.

Existing puzzle records on pronode local mongos are not backfilled — this change is forward-only.

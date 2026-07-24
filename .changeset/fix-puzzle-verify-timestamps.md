---
"@prosopo/database": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/cypress-shared": patch
---

fix(database): puzzle records now persist submittedAtTimestamp / verifiedAtTimestamp / failedAtTimestamp

Puzzle server-verify was returning verified:false on every solved puzzle in production. Root cause: updatePuzzleCaptchaRecordResult wrote submittedAtTimestamp via a $ifNull aggregation expression inside a pipeline $set, and mongoose silently dropped it on the wire — 0 of the last 3002 submitted puzzle records had the field. Reading the record back in serverVerifyPuzzleCaptchaSolution then treated missing submittedAtTimestamp as Number.POSITIVE_INFINITY, tripping submitToVerifyMs > timeout → TIMESTAMP_TOO_OLD on every request.

- Rewrite updatePuzzleCaptchaRecordResult and updatePuzzleCaptchaRecord to write the timestamp fields directly (no $ifNull). Safe because puzzle rejects re-submissions at puzzleTasks.ts:228-233 — each stamp is only ever written once. The change also lets both writes drop the pipeline form and use a plain $set.
- Add submittedAtTimestamp to the projection in getPuzzleCaptchaRecordByChallenge — the recency check couldn't see the field even after it was persisted, because the projection stripped it.
- Reinstate the puzzle end-to-end cypress spec that was reverted in PR #2855 (it was correctly surfacing this bug — the previous decision to remove it was wrong). The puzzle piece gets a data-cy selector gated on NODE_ENV !== "production" so esbuild strips it from production bundles — cypress builds with NODE_ENV=development to include the selector for the test, but real deploys don't ship a bot-friendly querySelector.

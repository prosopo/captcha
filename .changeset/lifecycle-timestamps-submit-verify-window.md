---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
"@prosopo/types": patch
"@prosopo/api": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
---

Track every lifecycle timestamp on every captcha type, and switch the dapp-verify recency check from issuance→verify to **submit→verify** with the window sourced from per-client settings.

### Lifecycle timestamps

`StoredCaptcha` (the base shared by PoW, Puzzle, and Image/UserCommitment) gains three new fields:

- `submittedAtTimestamp` — set once on the first user-submission write, never overwritten.
- `verifiedAtTimestamp` — set once when the dapp first calls /verify, never overwritten.
- `failedAtTimestamp` — set once on the first non-approved terminal state, never overwritten.

`lastUpdatedTimestamp` keeps its "last write of any kind" meaning. The new fields use `$ifNull` in aggregation-pipeline updates so the stamp lands only on the first transition — concurrent or repeat writes are no-ops on the lifecycle stamps.

### Submit→verify window

The dapp-verify recency check used to be `now - challengeTimestamp <= timeout`. The window was issuance→verify, which gave bots room to stockpile pre-solved solutions and redeem them many seconds (sometimes minutes) later from the time they reached the provider.

The check is now `now - challengeRecord.submittedAtTimestamp <= clientSettings.verifiedTimeout`. The window measures from the moment the user's solution actually arrived. Combined with the new lifecycle fields, this measurably tightens the stockpile attack surface — the data showed 1564 records / 21% on Twickets where a correct PoW was submitted but the dapp never verified, p99 issuance→submit of 31s on that cohort, and records up to 1.26 min.

### Settings move

`verifiedTimeout` moves to `ClientSettingsSchema` (per-client, operator-set via the portal). Default stays at 120000ms for back-compat; auto-submit dapps (Twickets et al.) should set it to ~10000ms.

Removed from request bodies entirely:

- `ServerPowCaptchaVerifyRequestBody`
- `ServerPuzzleCaptchaVerifyRequestBody`
- `SubmitPowCaptchaSolutionBody`
- `SubmitPuzzleCaptchaSolutionBody`

The client field was client-controlled and unsigned — any caller could raise the recency ceiling. It's now server-determined.

`ProviderApiInterface.submitPow/PuzzleCaptchaSolution` lose their `timeout` parameter (no longer forwarded). The verify wrappers keep their `recencyLimit` parameter for caller back-compat but the value is no longer transmitted; server reads from the client settings instead.

### Migration

Pre-PR records with `userSubmitted=true` but no `submittedAtTimestamp` will fail the new recency check. The submit window is short (120s default verifiedTimeout) so the migration cliff is naturally bounded — records in flight at deploy time expire within ~2 minutes.

348 provider unit tests + 28 database tests pass.

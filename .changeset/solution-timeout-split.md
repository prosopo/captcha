---
"@prosopo/provider": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/cli": patch
---

Split `solutionTimeout` (challenge issuance → user submission) from `verifiedTimeout` (submission → dapp's /verify call) on `UserSettings`. Historically `verifiedTimeout` gated both windows in `verifyRecency` (at /pow|puzzle/solution submit) and in `serverVerifyPowCaptchaSolution` (at /verify), even though its doc comment only described the latter. Adds `solutionTimeout` to `ClientSettingsSchema` (zod) and `UserSettingsSchema` (mongoose) with `DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT` (60s) as default. `submitPoWCaptchaSolution` and `submitPuzzleCaptchaSolution` now use `solutionTimeout` for the recency check and fall back to `verifiedTimeout` for pre-existing client records so behaviour is preserved until those records are backfilled. The `/verify` path is unchanged. Operators can now tighten `verifiedTimeout` (e.g. 20s) to invalidate stale solutions at verify time without also shrinking the user's solve budget.

---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/api": minor
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-puzzle": patch
---

A puzzle served after a wrong answer is now judged on the device the failed solve showed, and an escalation's solve readings are no longer dropped.

- After a wrong puzzle answer, the widget names the failed challenge in a new `retryOf` field on the next `/frictionless` request. `BotDetectionFunction` and `ProviderApi.getFrictionlessCaptcha` take it as a new trailing argument.
- The provider carries the failed solve's device readings onto the new session only when its own record of that puzzle shows the same client: same site, user account and exact IP address, identical user agent and TLS fingerprint, and a solve that was submitted and failed. The readings come from that solve's own behavioural payload, and each failed puzzle can be followed once (`claimPuzzleCaptchaRetry`). Anything else is ignored.
- `createSession` now persists `solveDevice`. It was missing from the session's field list, so a PoW escalation's solve readings never reached the challenge they were meant to size.

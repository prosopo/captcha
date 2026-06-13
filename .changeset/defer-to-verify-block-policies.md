---
"@prosopo/user-access-policy": minor
"@prosopo/provider": patch
---

Add `deferToVerify` flag on `AccessPolicy` so a Block policy can skip the request-time `blockMiddleware` (no 401 at the captcha endpoint) and fire instead at the verify step. The behaviour mirrors the existing coords-rule deferral pattern: today the middleware blanks out coords from the userScope, so coords-only rules can only ever match in the verify path. `deferToVerify` is the explicit version of that for other signals (ja4Hash, headersHash, etc.) — useful when you want the attacker to pay the captcha-solving cost and the dApp to silently receive `{verified: false}` instead of the bot's frontend seeing a 401.

Wiring:

- `BlacklistRequestInspector.shouldAbortRequest` filters out matching policies that have `deferToVerify` before picking the top hit. Those policies never short-circuit the middleware.
- `CaptchaManager.findHardBlockPolicy` widens its matcher: a Block policy now counts as a hard block when it has either no `captchaType` (existing behaviour) **or** `deferToVerify === true`. The check is invoked from `imgCaptchaTasks.dappUserSolution`, `powTasks.serverVerifyPowCaptcha`, and `puzzleTasks.verifyPuzzleCaptchaSolution`, so the deferral applies to all three captcha types.
- Persistence: `deferToVerify` lands on the mongo `accessPolicySchema` (Boolean) and the zod `accessPolicyInput` (with a string→boolean preprocess so the Redis round-trip works).

Motivating use case: a set of spoofed-JA4 hard-block rules pushed 2026-06-12. Marking those `deferToVerify: true` would still reject the attacker at verify but force them to complete N image captcha rounds and surface behavioural data on the commitment record before the rejection — useful for both telemetry and operator-side friction.

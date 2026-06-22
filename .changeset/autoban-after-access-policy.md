---
"@prosopo/provider": patch
---

fix(provider): defensive autoBan re-check inside access-policy path

`runDecisionMachine` already re-evaluates `autoBanScoreThreshold` after the
webView / timestamp / unverifiedHost score bumps (#2738). `handleAccessPolicy`
runs *before* `runDecisionMachine` and applies its own
`scoreIncreaseAccessPolicy` bump, but for non-block policies it short-circuits
straight to `sendImageCaptcha` / `sendPowCaptcha` / `sendPuzzleCaptcha` —
bypassing the downstream autoBan check. Close that gap by re-evaluating the
threshold inside `handleAccessPolicy` right after the bump.

No live traffic was observed hitting this path; this is a defensive close,
not a fix for an active incident.

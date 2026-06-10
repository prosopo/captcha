---
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-react": patch
"@prosopo/provider": patch
---

Image-captcha widget now forwards the trusted checkbox click `(clientX, clientY)` through `manager.start(x, y)`. `Manager.submit` embeds the pair as a 2-number prefix on the first captcha's solution salt. Provider peels the prefix via length math against `solution.length` (no protocol version flag — older clients keep working unchanged) and prepends it as the first entry of `pairs`, which is written to `UserCommitment.coords`. Adds `peelCheckboxPrefix` helper in `pairs.ts` with round-trip unit tests.

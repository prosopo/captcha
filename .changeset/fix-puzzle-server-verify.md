---
"@prosopo/types": patch
"@prosopo/server": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha": patch
"@prosopo/cypress-shared": patch
---

fix(server): dispatch verify by captchaType so puzzle tokens hit the puzzle endpoint

Puzzle tokens were silently failing server-side verification. `ProsopoServer.verifyProvider` only had two branches — `challenge` present → PoW verify, absent → image verify — but puzzle tokens carry a challenge too, so they were routed to `/VerifyPowCaptchaSolution` and 404'd on the pow record lookup (`captchastorage.puzzlecaptchas.serverChecked` stayed 0/N in prod). Customers using the puzzle flow got `verified: false` on legitimate solvers.

Fix in two parts:

- `@prosopo/types`: adds `captchaType?: CaptchaType` to `ProcaptchaOutputSchema` and appends `Option(str)` to `ProcaptchaTokenCodec`. The pre-existing binary layout is preserved in a frozen `ProcaptchaTokenCodecV1`, and `decodeProcaptchaOutput` falls back to it for tokens minted by client bundles that predate this field.
- `@prosopo/server`: `verifyProvider` now dispatches on `captchaType` (puzzle → `submitPuzzleCaptchaVerify`, pow → `submitPowCaptchaVerify`, image → `verifyDappUser`) with per-type `cachedTimeout` recency checks. The legacy challenge heuristic is kept as a fallback for old tokens with a `warn`-level log so ops can see the tail-off.
- `@prosopo/procaptcha-pow` / `procaptcha-puzzle` / `procaptcha`: each Manager now sets the correct `captchaType` on the object passed to `encodeProcaptchaOutput`.

Backwards compatibility: pow and image tokens minted by any prior client bundle continue to verify. Puzzle tokens minted by old bundles still fall through to the pow branch and 404 — same behaviour as before — until the customer upgrades both the client bundle and `@prosopo/server` together.

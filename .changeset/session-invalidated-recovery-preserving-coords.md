---
"@prosopo/types": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-react": patch
---

fix(procaptcha-frictionless,procaptcha-pow,procaptcha-puzzle,procaptcha-react): auto-recover from `CAPTCHA.NO_SESSION_FOUND` on the inner widget without asking the user to click the checkbox a second time, and without dropping the click coordinates that would otherwise land in the solution salt as `(0, 0)`.

Motivation. The in-flight dedupe added in the previous change only collapses `/captcha/{type}` POSTs that overlap in flight. A duplicate POST that fires ~1 s after the first has already settled (observed on iPhone WKWebView, incident 2026-07-01 21:23 UTC) still lands on a consumed session and returns `NO_SESSION_FOUND`. The pre-existing recovery for that case was a `setTimeout(restart, 100)` that tore the whole widget down and lost the checkbox click position.

- `ProcaptchaProps` gains two optional props: `onSessionInvalidated(x?, y?)` and `startCoords: { x, y }`. Widgets not mounted under a recovery-aware parent still fall back to `frictionlessState.restart()`.
- `procaptcha-pow`, `procaptcha-puzzle`, and `procaptcha-react` widgets now track the last `manager.start(x, y)` coords in a ref (either from the checkbox click or from `startCoords`) and, on the first `CAPTCHA.NO_SESSION_FOUND`, invoke `onSessionInvalidated(x, y)` instead of calling `restart()`. A per-instance ref makes it strictly one-shot — a second failure falls back to the existing restart path so a persistently broken session doesn't loop.
- `ProcaptchaFrictionless` wires `onSessionInvalidated` through to each inner widget: it stashes the retry coords in a ref, re-runs its own `start()` (which re-invokes `/frictionless` and mints a fresh sessionId), then re-mounts the inner widget with `autoStart={true}` and `startCoords={x, y}`. The inner widget auto-fires `manager.start(x, y)` on mount so the eventual submit still embeds the real checkbox click position in the salt.
- The recovery decision (one-shot fire, coord validation — `(0, 0)` and partial pairs are discarded because they're what an `autoStart` mount or an untrusted pointer event emits rather than a real click, and the consume-and-clear pending-coords ref) is extracted into `sessionInvalidatedRecovery.ts` with dedicated unit tests.

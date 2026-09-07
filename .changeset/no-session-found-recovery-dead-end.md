---
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-frictionless": patch
---

Stop `CAPTCHA.NO_SESSION_FOUND` leaving the widget on a dead checkbox.

Users reported a checkbox reading "No session found" that never recovered, usually after pressing the image-challenge reload button. Provider logs show the shape clearly: `POST /captcha/image` returns 200 and issues a challenge, then 2-6 seconds later the *same* sessionId is POSTed again and the provider answers 400 `CAPTCHA.NO_SESSION_FOUND` — `checkAndRemoveSession` consumed the session when it issued the first challenge, so a second challenge fetch on that id can never succeed.

Three defects combined to turn that into a permanent dead end.

- **The manager re-sent a sessionId it had already spent.** `defaultState()` doesn't clear `sessionId` and `buildUpdateState` skips `undefined`, so a stale id survives `resetState()` and any path that re-enters `start()` re-sends it. `Manager` now remembers the id it exchanged for a challenge and, rather than making a request it knows the provider will reject, routes straight to the `CAPTCHA.NO_SESSION_FOUND` state the wrapper already listens for.

- **Recovery was one-shot per outer widget lifetime and had no terminal branch.** `ProcaptchaWidget` always takes the `onSessionInvalidated` branch and returns before its own `frictionlessState.restart()` fallback, and its guard ref is fresh on every re-mount because the wrapper bumps the mount key. So once the wrapper's one-shot was spent, the second failure was handled by nobody: no re-mint, no restart, no message — just a stuck checkbox. `handleSessionInvalidated` is now a bounded counter (`MAX_SESSION_INVALIDATED_RETRIES`) rather than a boolean, it reports `exhausted` to the caller, a reload press clears it (a reload mints a genuinely new session, so it shouldn't spend the budget for the old one), and exhaustion falls over visibly through `fallOverWithStyle` — which schedules the existing 10-second full restart, so there is always a way back.

- **`resetState(0)` never reset anything.** `0 || stateRef.current.attemptCount` kept the old count, so `attemptCount` accumulated across every re-mint and `start()`'s own `attemptCount >= 5` fall-over fired after five *cumulative* runs in a widget lifetime. Five successful reload presses were enough to drop the user onto the error placeholder. Now `??`, so callers passing literal `0` get the reset they asked for.

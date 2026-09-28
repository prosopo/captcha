---
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/types": patch
---

Stop re-sending a consumed sessionId, and keep `CAPTCHA.NO_SESSION_FOUND` off the checkbox.

A provider consumes a session when it issues a challenge against it, so a second challenge fetch carrying the same id cannot succeed. Three changes follow from that:

- The puzzle widget's wrong-answer path called `manager.start()` again on the same session. It now hands back to the frictionless wrapper through `onReload`, which mints a new session and re-mounts the widget with `autoStart` — the same route the reload button already took. `onReload` gains an options argument, and `ProcaptchaProps` gains `startShowRetry`, so the replacement challenge still carries the retry prompt across the re-mount.
- The puzzle manager tracks the id it has already exchanged for a challenge and short-circuits rather than re-sending it, covering the other paths that re-enter `start()`. The id is marked once the provider has answered, not before the request goes out, so a throw still falls over onto another provider.
- `CAPTCHA.NO_SESSION_FOUND` is now treated as an internal recovery signal in the puzzle, PoW and image widgets and in the frictionless wrapper: where a re-mint is going to happen the widget holds its loading state instead of rendering the error. With no recovery route available the error is still shown.

The wrapper's restart is no longer a flat ten seconds. `getRestartDelayMs` in `@prosopo/procaptcha-common` doubles it to a two-minute ceiling, jittered over the top half of each interval, so a client that keeps losing its session retries indefinitely at a bounded rate.

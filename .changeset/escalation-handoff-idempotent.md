---
"@prosopo/procaptcha-frictionless": patch
---

Make the post-PoW escalation handoff idempotent.

Follow-up to the `CAPTCHA.NO_SESSION_FOUND` recovery fix: this is the other producer of the duplicate `/captcha/image` POST that fix had to recover from.

Production, 2026-09-07, the same affected user:

```
11:27:49.910  POST /pow/solution   200  escalation envelope returned
11:27:50.263  POST /captcha/image  200  escalation session issued
11:27:55.030  POST /captcha/image  400  CAPTCHA.NO_SESSION_FOUND, same session
```

The provider mints exactly one escalation session per PoW solution and consumes it on the first challenge fetch. The PoW manager fires `onEscalate` from inside its `providerRetry`-wrapped `submit()`, so a throw anywhere after the handoff re-runs `submit()` and escalates a second time on the same envelope — mounting a second image widget against a session the first one already spent. `onEscalate` now ignores a repeat handoff for a sessionId it has already mounted; a genuinely new escalation session is still followed.

Adds `escalationHandoff.integration.test.tsx`, which drives the real `ProcaptchaFrictionless` wrapper into the real image widget and its real `Manager` with only the network stubbed. The stub enforces the provider's one-shot session contract and returns the `NO_SESSION_FOUND` envelope in the response body rather than throwing — `HttpClientBase` only throws when a failure isn't JSON, so a 400 from the provider arrives as `challenge.error`, which is what the widget's recovery path keys off.

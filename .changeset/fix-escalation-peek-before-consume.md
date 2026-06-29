---
"@prosopo/database": patch
"@prosopo/provider": patch
---

fix(provider): peek (read-only) at the escalation session before consuming on the origin → escalation fallback

Follow-on to the route() escalation NO_SESSION_FOUND fix (#2771). When the widget hit `/captcha/pow` with the origin sessionId after a PoW-submit escalation to image/puzzle, `isValidRequest` resolved the Redis `origin → escalation` mapping and then immediately consumed the escalation session via `checkAndRemoveSession`. Because the escalation session's `captchaType` did not match the requested type, the handler returned `INCORRECT_CAPTCHA_TYPE` — and worse, the escalation session was already gone, so a widget that *did* know to switch to `/captcha/image` with the escalation sessionId from the PoW-submit envelope had nothing left to consume. Production rate jumped from ~4/hour on 3.6.47 to 58/hour on the single 3.6.49 node.

The fix peeks the escalation session read-only first (`getSessionRecordBySessionId`) and only calls `checkAndRemoveSession` when `peeked.captchaType === requestedCaptchaType`. On mismatch the session is left intact, the Redis pointer is still dropped (single-use), and `INCORRECT_CAPTCHA_TYPE` is surfaced. Also extends `getSessionRecordBySessionId`'s projection to include `captchaType` (previously dropped, which would have made every peek look like a mismatch).

---
"@prosopo/database": patch
"@prosopo/provider": patch
---

fix(provider): resolve origin sessionId to escalation when post-PoW route() escalates to image/puzzle

When the decision machine's route() phase escalates the user from PoW to an image/puzzle captcha, `buildEscalation` mints a fresh session — but the originating session has already been consumed by the preceding /captcha/pow request. Widgets that didn't switch to the escalation sessionId on the next /captcha/* call (older bundled SDKs, hand-rolled wrappers, network-retry races, tab races) landed on NO_SESSION_FOUND. Production deploy of R1/R2 escalations at 18:39 UTC caused a 4.6× spike in CAPTCHA.NO_SESSION_FOUND (363/hr → 1,668/hr); rate dropped immediately once the routing artifact was deleted.

Records an origin → escalation sessionId mapping in Redis at the moment `buildEscalation` creates the new session. On the next /captcha/* request, `isValidRequest` falls back to that mapping when `checkAndRemoveSession` returns null for the supplied sessionId, then invalidates the mapping (single-use). When Redis is unavailable the escalation still returns to the client unchanged — those deployments accept the widget must handle the new sessionId on its own.

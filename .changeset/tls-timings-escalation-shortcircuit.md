---
"@prosopo/provider": patch
---

fix(provider): persist TLS handshake timings on escalation + short-circuit sessions

`buildEscalation` (post-PoW image/puzzle escalation) and `runConfiguredCaptchaTypeShortCircuit` (sitekeys with a configured captchaType) both bypass `FrictionlessManager.setSessionParams`, so `req.tcpToChelloMs` / `req.chelloToHandshakeMs` were captured by the middleware but never landed on the resulting session record.

Threads the current request's per-connection timings through both paths:

- New optional `handshakeTiming` arg on `buildEscalation`, forwarded to `createSession`. Timings come from the current PoW-submit request, not from `originSession` (whose values belong to the earlier frictionless request's TCP connection).
- New optional `tcpToChelloMs` / `chelloToHandshakeMs` on `ShortCircuitInput`, spread into the locally-built `sessionParams`.

The frictionless main path (`sendCaptcha` / `registerBlockedSession`) was already correct — it merges from `setSessionParams`, which the handler populates.

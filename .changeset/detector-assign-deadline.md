---
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-bundle": patch
---

Stop dropping detector bundles that arrive slowly, which made the frictionless POST go out with an empty token and no `detectorSessionId` — the provider then scored the session at 0 and served a challenge.

`ASSIGN_TIMEOUT_MS` was 2000 ms and covered two legs. The assign POST serves the detector inline (~215 KB gzipped) over a connection that is always cold, because `/healthz` pins a different hostname than the assign target: fresh DNS, TLS and a CORS preflight all had to fit in the budget alongside the download, measured at 6.7s against staging. The cap is now 10 s and applies only to that request; the blob-URL import that parses and evaluates the bundle is untimed, since a timer cannot rescue a stalled main thread and only discards a bundle already in hand.

`render()` and the invisible-button path now start the detector prefetch too. Only implicit render did, so pages using the explicit API — including any page that loads the bundle via dynamic import, where implicit render never runs — assigned a detector inline on the widget's critical path with no prefetch to fall back on.

---
"@prosopo/provider": patch
"@prosopo/types": patch
---

feat(provider): surface handshake timings and currentUrl to routing machines

Extends `RoutingMachineRawSignals` with three optional fields so operator-authored routing machines can read them alongside JA4, headers, UA, and SIMD:

- `tcpToChelloMs?: number`
- `chelloToHandshakeMs?: number`
- `currentUrl?: string`

Threaded through every raw-signal construction site — the frictionless hot path, the dedup routing replay, `submitPoWCaptchaSolution`, and the postPow routing context construction. Timing values come from the current request (per-connection, fresh at every entry). `currentUrl` comes from the freshly decrypted frictionless payload at the `route` phase and from the persisted Session at the `postPow` phase, since the submit request's Referer is the captcha iframe rather than the host page.

Follows the earlier PR that added the middleware capture and Session persistence for the two timing fields; this PR completes the surface by making them visible to operator-authored routers.

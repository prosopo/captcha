---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

feat(provider): capture and persist per-TLS-connection handshake timings

Adds `handshakeTimingMiddleware` that reads two new headers forwarded by the chaddy Caddy plugin and threads the values through to the frictionless session store, so every persisted Session document carries them alongside `ipInfo` / `headers` / the entropy fingerprints.

- `X-TLS-TCP-To-Chello-Ms` — server-observed ms from TCP accept to first ClientHello byte
- `X-TLS-Chello-To-Handshake-Ms` — server-observed ms from ClientHello to handshake complete

Elevated values indicate the client's ClientHello traversed a proxy chain before reaching Caddy — the CH bytes only reach the terminating TCP stack after every hop, so the deltas inflate with the full client-to-exit RTT rather than just the last-mile RTT.

Middleware wires in immediately after `ja4Middleware` in `startProviderApi`. Both fields are optional throughout (`tcpToChelloMs?: number`, `chelloToHandshakeMs?: number`) on `Session`, `SessionSchema`, and the Mongoose model, so pre-migration documents parse and dev requests that skipped TLS still write cleanly. `express.d.ts` extends `AugmentedRequest` and `Express.Request` with the same two optional fields. No handlers are modified beyond the frictionless captcha challenge path; persisting on the other captcha-type storage paths (image / PoW / puzzle direct) is a follow-up.

Depends on chaddy plugin support for emitting the two headers.

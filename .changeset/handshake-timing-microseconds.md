---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

feat: switch handshake timings from milliseconds to microseconds

Milliseconds bucket fast handshakes (local proxies, same-DC clients) to 0/1 and destroy the distribution shape we need for proxy detection. `time.Now()` on Linux is ~1μs precise via vDSO — μs is the honest resolution ceiling.

Wire changes (must land together with the paired chaddy release):

- Headers consumed by `handshakeTimingMiddleware`: `x-tls-tcp-to-chello-ms` / `x-tls-chello-to-handshake-ms` → `x-tls-tcp-to-chello-us` / `x-tls-chello-to-handshake-us`.
- Request augmentation, `HandshakeTiming` fields, decision-machine input, `Session` shape (Zod + Mongoose schemas): `tcpToChelloMs` / `chelloToHandshakeMs` → `tcpToChelloUs` / `chelloToHandshakeUs`.
- New sessions in `captchastorage.sessions` will now write `tcpToChelloUs` / `chelloToHandshakeUs` in μs. Historical `*Ms` fields on existing session records remain as-is (not migrated) — analytics that read both must range-scan by field name.

Rollout: deploy paired chaddy image (emits `-Us` headers) simultaneously; the deploy-order window drops timing signal but no data corruption is possible (mismatched header names simply resolve to `undefined`).

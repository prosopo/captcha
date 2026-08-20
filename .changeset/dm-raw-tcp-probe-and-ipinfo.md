---
"@prosopo/provider": patch
"@prosopo/types": patch
---

feat(provider,types): surface tcp-probe + ipInfo on routing raw

`RoutingMachineRawSignals` gains the 9 raw TCP-handshake fields
(`synNs / synackNs / ackNs / observedTtl / tcpMss / tcpWscale /
tcpOptsFlags / tcpOptsOrder / tcpWindow`) and the per-request
`ipInfo` payload. Callsites that build a routing raw — the
frictionless entry, its dedup replay branch, and the PoW submit
post-pow hop — spread `req.ipInfo` alongside the existing
`rawTlsSignalsForSession(req)`, gated on the discriminated-union
success branch so the routing machine never sees an
`isValid:false` error payload.

Route-time `ipInfo` is separate from the existing decide-kind
`input.ipInfo` (persisted on the Session record at verify time).
The DM helper is being updated in the captcha-private
decision-machines package to resolve both channels through one
matcher surface.

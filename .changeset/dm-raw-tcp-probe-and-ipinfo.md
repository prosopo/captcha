---
"@prosopo/provider": patch
"@prosopo/types": patch
---

feat(provider,types): surface tcp-probe + ipInfo on both routing and decide inputs

`RoutingMachineRawSignals` gains the 9 raw TCP-handshake fields
(`synNs / synackNs / ackNs / observedTtl / tcpMss / tcpWscale /
tcpOptsFlags / tcpOptsOrder / tcpWindow`) and the per-request
`ipInfo` payload. `DecisionMachineInput` gains the same 9
tcp-probe fields at the top level so verify-time decide rules
can gate on them alongside the existing `ipInfo` field.

Route-time callsites (frictionless entry, dedup replay, PoW
submit post-pow hop) spread `req.ipInfo` alongside the existing
`rawTlsSignalsForSession(req)`, gated on the discriminated-union
`isValid:true` branch so the routing machine never sees an
`isValid:false` error payload.

Decide-time callsites (`powTasks.ts`, `imgCaptchaTasks.ts`,
`puzzleTasks.ts`) surface the tcp-probe fields from the persisted
`sessionRecord` — the middleware writes them to Session at
frictionless entry, so verify sees the exact fingerprint captured
on the original TCP handshake.

Route-time `ipInfo` is separate from the existing decide-kind
`input.ipInfo` (persisted on the Session record at verify time).
The captcha-private decision-machines helper is being updated in
a paired PR to resolve both channels through one matcher surface.

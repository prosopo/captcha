---
"@prosopo/database": patch
---

Extend `getSessionRecordBySessionId` projection with the nine tcp-probe fields (`synNs`, `synackNs`, `ackNs`, `observedTtl`, `tcpMss`, `tcpWscale`, `tcpOptsFlags`, `tcpOptsOrder`, `tcpWindow`).

The img / pow / puzzle verify paths forward these onto `DecisionMachineInput` so decide rules can match TCP fingerprints (e.g. `tcp-stack-dc-linux-ts-off`, `tcp-ttl-windows-ua-linux-stack`). The projection had never been extended past the pre-tcp-probe set, so every DM decide call received `undefined` for the whole group and the rules silently returned `null` against real traffic. Adds a regression guard in `sessionRecordProjection.integration.test.ts` that persists a session with every tcp-probe field and asserts each round-trips through the getter.

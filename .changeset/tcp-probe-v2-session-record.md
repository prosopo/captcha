---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
---

Read the new X-TCP-Probe header from chaddy and save the whole record on the Session as `tcpProbe`. This adds IPv6 connections and the packets sent after the first handshake to what we store. The older X-TLS-* signals keep working.

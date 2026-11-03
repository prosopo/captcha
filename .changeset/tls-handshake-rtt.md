---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Store the TLS handshake round trip on each session as `tlsHandshakeRttUs`.

chaddy now sends `X-TLS-Handshake-Rtt-Us`: the time from the server's handshake reply to the client's answer, in microseconds. The provider reads it with the other raw TLS signals, saves it on the session and passes it to decision machines. Until now we only had the TCP round trip (`synackNs` to `ackNs`), which can come from a different machine to the one that does TLS.

The old `chelloToHandshakeUs` is not a handshake time. chaddy takes it when each request arrives, so on a reused connection it is really the connection's age (median about 2 seconds). This change leaves it as it is.

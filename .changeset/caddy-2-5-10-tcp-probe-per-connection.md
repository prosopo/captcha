---
"@prosopo/caddy-docker": patch
---

`prosopo/caddy:2.5.10` picks up chaddy with the TCP handshake record kept for the life of each connection (prosopo/chaddy#19).

tcp-probe keeps a record for 10 seconds after the handshake, and chaddy used to ask for it on every request, so any request on a connection older than that arrived with no TTL, MSS, window or TCP-options headers. On puzzle submits that was 52% of IPv4 traffic. chaddy now fetches the record when the ClientHello arrives and reuses it for every request on the connection.

The same bump brings in chaddy#16 and #17, which read both the 80-byte record the deployed tcp-probe sends and the newer 104-byte one. Against the deployed probe the header set is unchanged.

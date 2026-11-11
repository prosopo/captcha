---
---

`prosopo/caddy:2.5.13` ships the chaddy build already pinned in the Dockerfile (prosopo/chaddy#21). It asks tcp-probe v2 about each connection through its own socket, and forwards the answer as `X-TCP-Probe` for IPv4 and IPv6 alike. The image in use (2.5.12) predates it and only makes the old IPv4-only lookup, so no IPv6 session gets any TCP signal. The legacy `X-TLS-Tcp-*` headers are unchanged.

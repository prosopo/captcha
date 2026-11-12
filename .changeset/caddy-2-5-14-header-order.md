---
---

`prosopo/caddy:2.5.14` pins chaddy with the new `header_order` listener wrapper (prosopo/chaddy#15), and the provider Caddyfile turns it on after `tls`. Caddy re-sorts request headers before proxying, so the order a client sent them in was lost before the provider saw the request. The wrapper reads the header names off the decrypted connection first and forwards them, in arrival order, as `X-Header-Order` (a client-sent `X-Header-Order` is always removed). It covers HTTP/2 and HTTP/1.1. Captcha records already store every request header, so the new header shows up on them with no provider change.

The wrapper closes connections that haven't finished TLS and sent a request within 10s, because wrapping the connection removes Go's own handshake timeout. The image must be published before this Caddyfile is deployed, or Caddy won't recognise `header_order` and won't start.

---
"@prosopo/caddy-docker": minor
---

Forward each request's header order to the provider.

Caddy parses request headers into a map and re-writes them to the provider in its own sorted order, so the order a client sent was lost before the provider saw the request. Chaddy's new `header_order` listener wrapper reads the header names off the decrypted connection first and adds them, in arrival order, as an `X-Header-Order` header (a client-sent `X-Header-Order` is always removed). It works for HTTP/2 and HTTP/1.1.

The provider Caddyfile enables it after `tls`. It needs Caddy v2.11+, which the new chaddy requires, so the image moves to 2.6.0. The image must be published before this Caddyfile is deployed, or Caddy won't recognise `header_order`.

---
"@prosopo/caddy-docker": patch
---

fix(caddyfile): move `tcp_probe_socket` inside the `client_hello` block

Chaddy's caddyfile parser registers `client_hello` as the caddyfile
global option and reads `tcp_probe_socket` as a sub-key inside that
block. v3.7.17 placed the directive at top-level global scope, which
caddy's config-adapter rejects with `unrecognized global option:
tcp_probe_socket` — caddy exits 1 at startup and the container
restart-loops. Move the directive into `client_hello { … }` so it is
parsed by the plugin instead of the caddy core.

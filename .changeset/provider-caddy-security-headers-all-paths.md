---
---

Send HSTS, `X-Content-Type-Options: nosniff` and `Referrer-Policy` on every provider response, not just `/`.

In `docker/provider.Caddyfile` these lived in a `header / { ... }` block, and that matcher only matches the path `/`, so every API call, `robots.txt` and any response Caddy wrote itself went out without them. They now apply to every path. `X-Frame-Options: DENY` stays limited to `/` because customers frame some provider pages. `Referrer-Policy` is `strict-origin-when-cross-origin`, the browser default, so no referrer the provider relies on changes.

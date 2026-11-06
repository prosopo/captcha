---
"@prosopo/client-example-server-compose": patch
"@prosopo/oo-compose": patch
"@prosopo/redis-compose": patch
---

Compose files now pin exact image versions instead of :latest (redis-stack 7.4.0-v8, client-example-server 2.7.31, js_server 2.1.0, prosopo/caddy 2.5.12, openobserve v1.1.2), so a new upstream release can no longer change a deploy or test run unannounced.

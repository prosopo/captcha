# @prosopo/redis-compose

## 1.1.0
### Minor Changes

- dd3c8d0: Group the provider, provider-mock, oo, client-example-server, redis and mongo compose files and Caddyfiles into one versioned package per stack, so a deploy can pin the exact bundle it runs. Each package lints its own files.

### Patch Changes

- b982c33: Compose files now pin exact image versions instead of :latest (redis-stack 7.4.0-v8, client-example-server 2.7.31, js_server 2.1.0, prosopo/caddy 2.5.12, openobserve v1.1.2), so a new upstream release can no longer change a deploy or test run unannounced.

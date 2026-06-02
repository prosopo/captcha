---
"@prosopo/provider": patch
---

Fix provider crash-loop on startup in maintenance mode.

`domainMiddleware` constructed `new Tasks(env)` eagerly at wire-up time, which
calls `env.getDb()`. In `MAINTENANCE_MODE=true` the DB is intentionally never
connected (`isReady()` skips the connect), so `getDb()` throws
`"db not setup! Please call isReady() first"`. That error was unguarded and
propagated out of `startProviderApi`, crashing the process on every boot and
leaving the provider in a Docker restart loop.

`Tasks` is now resolved lazily on the first request that actually needs domain
validation — i.e. only once maintenance mode is off — mirroring the existing
lazy pattern in `blockMiddleware`. The request handler already short-circuits
on `getMaintenanceMode()` before touching the DB, so no request path depends on
the eager construction.

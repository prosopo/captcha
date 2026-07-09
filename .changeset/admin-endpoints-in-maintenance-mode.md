---
"@prosopo/env": patch
"@prosopo/provider": patch
---

Keep the provider admin endpoints working while `MAINTENANCE_MODE` is on. Previously the admin/access-rule router was skipped entirely at boot in maintenance mode — `Environment.isReady()` never connected the DB, so `env.getDb()` threw and the DB-backed `Tasks` couldn't be constructed — which meant adding/removing site keys (access rules), detector keys and decision machines all 404'd on a node in maintenance mode.

Now, in maintenance mode `Environment.isReady()` creates the `ProviderDatabase` handle and connects in the **background** (without awaiting), so a slow or unavailable Mongo/Redis socket still can't gate boot, but `env.getDb()` returns a usable handle and the admin endpoints register and function. The captcha request path is unchanged — it still short-circuits to a maintenance "pass" before touching the DB. `blockMiddleware` now has an explicit maintenance-mode skip (it previously relied on `env.getDb()` throwing to no-op) so the blocklist/Redis lookup stays off the captcha hot path.

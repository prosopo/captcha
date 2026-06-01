---
"@prosopo/api-express-router": patch
"@prosopo/api-route": patch
"@prosopo/cli": patch
"@prosopo/client-example-server": patch
"@prosopo/common": patch
"@prosopo/database": patch
"@prosopo/datasets": patch
"@prosopo/datasets-fs": patch
"@prosopo/dotenv": patch
"@prosopo/env": patch
"@prosopo/flux": patch
"@prosopo/ipinfo": patch
"@prosopo/logger": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/provider": patch
"@prosopo/provider-mock": patch
"@prosopo/redis-client": patch
"@prosopo/scripts": patch
"@prosopo/server": patch
"@prosopo/types-database": patch
"@prosopo/types-env": patch
"@prosopo/user-access-policy": patch
---

Extract the logger into its own `@prosopo/logger` package, out of `@prosopo/common`. Consumers now import logger symbols from `@prosopo/logger`; `@prosopo/common` no longer re-exports them. Unused `@prosopo/common` dependencies pruned where the only usage was the logger.

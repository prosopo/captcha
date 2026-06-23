---
"@prosopo/api-express-router": patch
"@prosopo/provider": patch
---

Drop the dead capitalized `Authorization` header lookup; Node lowercases all incoming request headers, so only `req.headers.authorization` is ever populated.

---
"@prosopo/provider": patch
---

Admin endpoints now narrow req.logger with a subscope instead of creating a fresh logger, preserving request context (requestId, user, siteKey) in all admin endpoint logs.

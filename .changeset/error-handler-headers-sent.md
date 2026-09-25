---
"@prosopo/api-express-router": patch
---

The shared express error handler now passes the error on to express when the response has already started, instead of trying to set a status and headers on it. Before, it threw "Cannot set headers after they are sent", which replaced the real error in logs and error handlers further down the chain.

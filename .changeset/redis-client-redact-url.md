---
"@prosopo/redis-client": patch
---

The Redis client no longer writes the Redis password to the logs. It used to attach the full connection URL, including any `user:password@`, to every log line, and now the credentials show as `redacted`. A failed first connect or a failed index setup, for example on a Redis server without the search module, is now logged as an error. Before, the failure became an unhandled promise rejection, which crashes Node by default. Callers of `getClient()` still receive the error.

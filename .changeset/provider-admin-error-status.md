---
"@prosopo/api-express-router": patch
---

Honour the adapter's `errorStatusCode` and the `{ error: ... }` JSON envelope in the default endpoint adapter's catch block. `ProsopoBaseError`s now surface their own status code via `unwrapError`; unexpected errors fall back to the configured `errorStatusCode` as JSON, instead of a hardcoded 500 plain-text response.

---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
---

A Web Bot Auth (authenticated) token can now only be verified once, even when several verify requests for it arrive at the same time. Before, the provider checked whether the session was already used and then marked it used in a separate step, so parallel verifies could all return `verified: true`. Marking the session used is now a single conditional database write, and only the request that wins it is verified; the rest get `API.USER_ALREADY_VERIFIED`.

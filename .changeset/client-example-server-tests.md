---
"@prosopo/client-example-server": patch
---

Add unit and type tests for the client example server, and fix the defects they exposed:

- `getRoutes` built one module-level router shared by every call, so a second call stacked handlers on the first call's bound config.
- `isAuth` could fall through without sending a response, and could send twice for a malformed `Authorization` header.
- The `if (passwordHash)` guard in signup had no else branch, leaving a request hanging when it was falsy.
- A `serverUrl` without a port resolved to `NaN`, so the server listened on an arbitrary free port; it now falls back to 9228.
- Removed the unreachable `OPTIONS` handler (`cors()` already answers preflight) and leftover debug logging.
- `app.ts` no longer boots a server on import; it exports `createApp`, `startServer` and `main`, and only runs when executed directly.

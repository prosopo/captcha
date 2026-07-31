---
"@prosopo/provider-mock": patch
---

Add unit and type tests for the provider mock, and fix the defects they found:

- `/test` opened a mongo connection and only closed it after a successful write, so
  every failing request leaked a connection for the life of the process. The close
  now happens in a `finally`.
- `JA4Database.connect()` read models off `this.connection` without checking the base
  class had set one, turning a failed connect into "cannot read properties of
  undefined" much later; it now throws `DATABASE.CONNECTION_UNDEFINED`.
- Queries issued before `connect()` hit an unreachable `!this.tables` guard and threw a
  `TypeError`; they now report a `ProsopoDBError`.
- The api port was the hardcoded string `"9229"`. It is now read from
  `PROVIDER_MOCK_PORT`, validated as a port number, and defaulted when unusable.
- `start.ts` called `startApi()` at module scope, so importing anything from the
  package started a server. Startup is now behind an `isMain` guard.
- Startup failures resolved quietly, leaving a container with nothing listening in it;
  `main` now exits non-zero.
- Route handlers are adapted through `toRequestHandler`, which forwards a rejected
  handler to the error middleware instead of leaving an unhandled rejection and a
  hanging request.

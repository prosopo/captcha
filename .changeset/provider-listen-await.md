---
"@prosopo/provider": patch
---

`startProviderApi` now resolves once the server is actually listening, and rejects if the bind fails. It previously returned the server straight from `.listen()`, which resolves before the socket is bound — a bind failure such as `EADDRINUSE` then surfaced as an `'error'` event with nothing waiting on it, i.e. an uncaught exception rather than a rejection the caller could handle.

Integration suites reserve a port from the OS instead of guessing one. Six suites picked a port from `process.pid` plus a random offset with no availability check, while CI runs a real provider alongside the tests; a collision failed the whole run with an uncaught `EADDRINUSE` even though every test passed. The retry loops that tried to work around this are gone — they retried into another unchecked port and, because the failure was never a rejection, never ran at all.

---
"@prosopo/client-example-server": patch
---

Warm up the app.js import once before the entrypoint tests, so the cold transform no longer times out whichever case runs first on a loaded machine.

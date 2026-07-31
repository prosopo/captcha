---
"@prosopo/http-blackhole": patch
---

Fix shutdown hanging on held-open connections, validate PORT strictly instead
of silently defaulting, surface close() failures as a non-zero exit, ignore
repeat shutdown signals, and log connections that never send a request.

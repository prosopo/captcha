---
"@prosopo/client-example-server": patch
---

Stop the example server from logging the site secret. The demo's API-verify path built the siteverify request body — which includes the site's private secret — and logged the whole object at info level, teaching integrators to copy a pattern that leaks their secret into their logs. The secret is now redacted in the log line; it is still sent to the verify endpoint unchanged.

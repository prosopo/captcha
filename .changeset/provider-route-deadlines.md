---
"@prosopo/provider": patch
---

Every provider API route now has a time limit. If a handler hasn't answered by then, the caller
gets a 504 "request timed out" instead of waiting indefinitely, and the handler's late reply is
quietly dropped. Limits:
- verify endpoints: 10s;
- other client (widget) endpoints: 15s;
- health, metrics and details: 5s;
- admin endpoints: 60s;
- replacing the detector pool: 5 minutes;
- anything else: 30s.

Upload time is not counted, because the clock starts after the request body has been read.

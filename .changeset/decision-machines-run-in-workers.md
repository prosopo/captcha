---
"@prosopo/provider": patch
---

Run decision machines in worker threads. A slow machine no longer holds up other requests, and the time limit now actually stops a machine that overruns.

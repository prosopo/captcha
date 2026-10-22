---
"@prosopo/provider": patch
"@prosopo/cli": patch
"@prosopo/database": patch
---

Serve the provider's admin routes from Rust: site keys, decision machines, usage counters, maintenance mode, DNS events from the sidecar and session state. Checked against the real express app on live MongoDB and Redis. The detector-pool replacement stays in TypeScript for now. The TypeScript is unchanged.

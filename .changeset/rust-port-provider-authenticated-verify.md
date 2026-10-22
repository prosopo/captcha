---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Port the provider's authenticated-session verify route to Rust, the last of the verify routes. Checked against the real express app on live MongoDB and Redis. The TypeScript is unchanged.

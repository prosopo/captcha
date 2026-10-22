---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Port the provider's image verify route to Rust, with the solved-captcha usage counters it updates. Checked against the real express app on live MongoDB and Redis. The TypeScript is unchanged.

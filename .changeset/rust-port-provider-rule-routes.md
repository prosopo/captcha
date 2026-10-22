---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Serve the access-rule admin routes from the Rust provider, behind the admin login, clearing the block cache whenever a rule changes. Checked against the real express app on live Redis. The TypeScript is unchanged.

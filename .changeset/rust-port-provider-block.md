---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Port the provider's access-policy blocking to Rust: requests matched by a Block rule are refused with the same 403 and stored as blocked sessions, using the same rule ranking and the same short-lived verdict cache. Checked against the real express app on live MongoDB and Redis, with a new live test harness shared by the next ports. The TypeScript is unchanged.

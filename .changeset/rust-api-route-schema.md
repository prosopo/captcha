---
"@prosopo/api-route": patch
---

Add a Rust replacement for the zod schemas that validate request bodies and config, for the upcoming Rust provider service. It accepts and rejects the same input as zod 3.23, produces the same parsed output and reports the same issues. The TypeScript package is unchanged.

---
"@prosopo/types": patch
"@prosopo/common": patch
---

Add the provider API to the Rust port of the shared types: route paths, default rate limits, and the request and response bodies with their validation, as typed structs. They accept the same requests as the TypeScript and parse them to the same output. `ApiJsonError` moves from the Rust common crate to the types crate, where the other wire types are. The TypeScript packages are unchanged.

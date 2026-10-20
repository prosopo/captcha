---
"@prosopo/util": patch
---

Add a Rust port of the server-side parts of `@prosopo/util` (crate `prosopo-util`): PoW difficulty checks, IP address parsing, domain/URL validation including the outbound-request SSRF guard, salt data embedding, coords validation, `flatten`, `verifyRecency` and the ETag/Last-Modified file cache. It is for the upcoming Rust provider service; the TypeScript package is unchanged.

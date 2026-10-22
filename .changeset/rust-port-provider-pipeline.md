---
"@prosopo/provider": patch
"@prosopo/cli": patch
"@prosopo/api-express-router": patch
---

Port the provider's request pipeline after its public routes to Rust: the per-route rate limits, the security headers, the 404 for non-API paths, request logging and language, the TLS and network signals read from the edge proxy's headers, the header check on client routes, and the admin token check. Checked against the real express app answering the same requests. The Rust JSON error responses now carry the ETag express adds. The TypeScript is unchanged.

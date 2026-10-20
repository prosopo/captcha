---
"@prosopo/web-bot-auth": patch
---

Added a Rust port of the Web Bot Auth verifier (Signature-Agent, Signature-Input and Signature parsing, signature base construction, Ed25519 verification and the cached JWKS directory resolver with its SSRF guard), for use by the upcoming Rust provider service. The TypeScript package is unchanged.

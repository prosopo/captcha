---
"@prosopo/types": patch
"@prosopo/api": patch
---

Add what the Rust server SDK needs: the client and server config schemas, including the captcha timeouts, and the provider verify calls for every captcha type. Both are checked against the TypeScript. The TypeScript is unchanged.

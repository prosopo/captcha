---
"@prosopo/keyring": patch
---

Prove sr25519 compatibility between the TypeScript and Rust keyrings by cross-verification: signatures made by each side with real randomness are verified by the other, alongside byte-for-byte checks of keys, SS58 addresses and mini-secrets. Adds a TypeScript test that verifies Rust-made signatures. The keyring's behaviour is unchanged.

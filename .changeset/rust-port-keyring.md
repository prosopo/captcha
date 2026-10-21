---
"@prosopo/keyring": patch
"@prosopo/types": patch
---

Add a Rust port of the keyring: sr25519 key pairs made from a mnemonic, seed, secret URI or JSON key file, with signing, verification and export, and `getPair`, which the provider loads its account with. The key file and keyring option types are added to the Rust port of the shared types. The TypeScript is unchanged.

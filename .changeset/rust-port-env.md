---
"@prosopo/env": patch
"@prosopo/database": patch
---

Port the provider environment to Rust: the new `prosopo-env` crate gets the config, key pair, database and IP information service ready the way `@prosopo/env` does, including the maintenance-mode background connect and the start-up cleanup. The Rust provider database can now be set up before it connects, as the TypeScript one is. The TypeScript is unchanged.

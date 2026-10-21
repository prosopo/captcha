---
"@prosopo/database": patch
---

Add the session methods to the Rust port of the provider database, checked against commands and replies recorded from the TypeScript on a real mongod, with the TypeScript's session projection and ipInfo integration tests ported. The Rust port now also reports a write that fails inside an otherwise successful command, such as a duplicate key, as the TypeScript does. The TypeScript is unchanged.

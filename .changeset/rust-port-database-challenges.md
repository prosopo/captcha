---
"@prosopo/database": patch
---

Add the PoW, puzzle, audio and icon-order record methods and the index set-up to the Rust port of the provider database, checked against commands and replies recorded from the TypeScript on a real mongod, with the TypeScript's concurrency and email-count integration tests ported. The TypeScript is unchanged.

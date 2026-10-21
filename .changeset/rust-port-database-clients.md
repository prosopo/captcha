---
"@prosopo/database": patch
---

Add the scheduled task, client record, decision machine and spam email domain methods to the Rust port of the provider database, checked against commands and replies recorded from the TypeScript on a real mongod, with the TypeScript's projection contract and captcha label tests ported. The TypeScript is unchanged.

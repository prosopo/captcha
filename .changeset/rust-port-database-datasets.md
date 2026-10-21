---
"@prosopo/database": patch
"@prosopo/types-database": patch
---

Add the dataset, captcha and solution methods to the Rust port of the provider database. Each sends the same commands mongoose sends, checked against commands and replies recorded from the TypeScript on a real mongod, and returns what the TypeScript returns. The TypeScript is unchanged.

---
"@prosopo/database": patch
---

Add the image captcha commitment, user solution and pending request methods to the Rust port of the provider database, checked against commands and replies recorded from the TypeScript on a real mongod, with the TypeScript's commitment integration tests ported. The TypeScript is unchanged.

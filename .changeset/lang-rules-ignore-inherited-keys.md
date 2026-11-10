---
"@prosopo/provider": patch
---

The `lRules` language score now only counts languages that are actually listed in the config. A language tag that happens to match a built-in object property (for example `constructor` or `__proto__`) used to be looked up on the object's prototype, which turned the score into a string and made the request fail; such tags now score 0 like any other unlisted language.

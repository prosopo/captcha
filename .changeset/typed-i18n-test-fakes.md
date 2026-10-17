---
"@prosopo/locale": minor
"@prosopo/api-express-router": patch
"@prosopo/types": patch
---

`@prosopo/locale` now exports `createUntranslatedI18n()`: a complete i18n instance with no catalogues, where `t` gives back the default value or the key. The tests use it in place of hand-made fakes that were cast to the i18n type. Those casts let a fake miss a method the code calls (as happened with `exists`) and still compile; now a missing method is a type error.

`handleErrors` now only asks for the request and response fields it actually uses, so its tests can pass plain objects. It is still an Express error handler.

The `i18n` prop on the image, audio, PoW and puzzle widgets is now typed as optional. The widgets already started their own i18n when none was passed; the type said it was required, so the tests had to cast `undefined` to pass nothing. The frictionless widget still requires it, because it reads from it straight away.

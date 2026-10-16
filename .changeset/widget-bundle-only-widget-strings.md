---
"@prosopo/locale": patch
"@prosopo/common": patch
"@prosopo/provider": patch
"@prosopo/api-express-router": patch
"@prosopo/procaptcha-bundle": patch
---

The widget bundle no longer contains the English image labels and server error strings. `ProsopoError` used to check message keys against every English catalogue, which pulled all of them into the widget. It now asks the i18n instance it was given (`exists`). The server-only key helpers (`isTranslationKey`, `isTargetKey`, `englishText`) moved to their own module.

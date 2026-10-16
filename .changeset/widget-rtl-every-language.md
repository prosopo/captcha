---
"@prosopo/locale": patch
"@prosopo/cypress-shared": patch
---

`getLanguageDirection` now knows every right-to-left language and script in CLDR 48, not just ten languages, including ones we have no translation for yet (Hebrew, Persian, Urdu, Pashto, Kurdish and so on). It also reads script subtags (`pa-Arab` is right to left, `az-Latn` left to right), regions whose usual script is Arabic (`pa-PK`, `uz-AF`), and old codes such as `iw` for Hebrew. Where the browser has `Intl.Locale` text info, a language it says is right to left is laid out that way too, so languages added to CLDR later work without a code change. The language e2e test now also checks that an Arabic widget, chosen by the browser or by `data-language`, is laid out right to left.

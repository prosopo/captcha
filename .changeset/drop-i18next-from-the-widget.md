---
"@prosopo/locale": minor
"@prosopo/common": patch
---

Stop shipping i18next to the browser. Saves about 22KB gzipped off the widget.

The widget was pulling in i18next and four of its plugins — a language detector, an HTTP backend, a chained backend and a resources-to-backend adapter, which between them also dragged in the `cross-fetch` polyfill — to look up 444 short strings with no plurals, no nesting and two interpolated values. That machinery is about 23KB gzipped; the replacement is 1.25KB.

`i18nFrontend.ts` now does the job directly: pick a language, fetch the matching `locales/<lang>/translation.json` next to the bundle, and look keys up in it. Behaviour is unchanged in the ways a visitor can see:

- language is chosen from the widget's own setting first, then a cookie, then localStorage, then the browser — the same order as before, and the choice is still remembered in both cookie and localStorage
- a regional tag like `de-AT` still resolves to `de`
- English is still fetched alongside the chosen language, so a key a translation is missing still renders English rather than its key
- `{{name}}` placeholders are still filled in, including in a caller's `defaultValue`
- if the catalogue cannot be fetched the widget still renders, in English, rather than waiting

i18next stays for the server, where `i18next-http-middleware` needs the real instance to read the `Accept-Language` header. `Ti18n` is now a small interface describing the handful of methods this repository actually calls, which both implementations satisfy, so `@prosopo/common` no longer needs i18next for a type either.

Covered by 189 tests in `@prosopo/locale`, and the built bundle was checked in a real browser: French picked up from the browser, a switch to German, interpolation, and both fallbacks.

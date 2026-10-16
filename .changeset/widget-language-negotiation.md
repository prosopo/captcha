---
"@prosopo/locale": minor
"@prosopo/api": minor
"@prosopo/procaptcha": patch
"@prosopo/procaptcha-audio": patch
"@prosopo/procaptcha-icon-order": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/provider": patch
---

The widget now tells the provider which language to use, so the challenge text comes back in the user's language.

- The widget sends its language in a `Prosopo-Lang` header on every provider request. It uses the site's `data-language` if set, otherwise the browser's languages. The browser's own `Accept-Language` is left untouched, so bot detection still sees the real value.
- `data-language` may list several codes (`"xx, tr"`). The first one we support wins. If none are supported, the widget uses the browser's language instead of English.
- The provider picks `?lng=`, then `Prosopo-Lang`, then `Accept-Language`, then English.
- A variant uses its parent's catalogue (`zh-SG` → `zh`, `pt-PT` → `pt`). Traditional Chinese (`zh-TW`, `zh-HK`, `zh-Hant`) skips the Simplified `zh` catalogue and moves on to the reader's next language. `nb`/`nn` map to `no`, `in` to `id` and `jw` to `jv`.
- The widget no longer reads or writes an `i18next` cookie or local storage key on the host site.
- `ApiClient`/`ProviderApi` take optional default headers as a 4th constructor argument.

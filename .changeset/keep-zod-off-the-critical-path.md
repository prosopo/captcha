---
"@prosopo/types": minor
"@prosopo/locale": minor
"@prosopo/logger": minor
"@prosopo/common": patch
"@prosopo/load-balancer": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/types-database": patch
---

Stop loading zod before the widget can draw itself. Takes another 13KB gzipped off the critical path.

zod is 14KB gzipped and it was being downloaded and parsed before the checkbox appeared, because six small things on the startup path happened to use it:

- two lists of strings in `@prosopo/logger` (log levels, output format)
- two lists of strings in `@prosopo/locale` (language codes, translation keys)
- two lists of two strings in `@prosopo/types` (start mode, challenge placement)
- one four-field object in `@prosopo/load-balancer` (a provider entry)
- an `instanceof ZodError` check in `@prosopo/common`
- `INPUT_LIMITS`, a plain table of numbers, that happened to live in the same file as zod-based string builders

None of these need a validation library. They are now plain TypeScript: a list, a type, and where input is untrusted, a one-line guard. `INPUT_LIMITS` moved to its own file so reading it no longer drags the builders along.

zod has not gone anywhere — the real request and response schemas in `@prosopo/types` still use it, and still validate exactly as before. It now arrives with the code that needs it, after the widget is on screen, rather than in front of it.

Two API changes for anyone importing these directly:

- `LanguageSchema`, `TranslationKeysSchema`, `StartModeSchema` and `Placement` are no longer exported as zod schemas. Use `isLanguage()`, `isStartMode()`, `isPlacement()` to check a value, and `LanguageCodes`, `translationKeys`, `StartModes`, `Placements` for the lists.
- `isZodError()` now recognises a zod error by its name rather than `instanceof`. That is strictly more tolerant: the name still matches when an error crosses a realm boundary or comes from a second copy of zod, which `instanceof` misses — it was already the fallback arm of the same check.

Two behaviour notes: a malformed entry in the fetched provider list now throws a plain `Error` naming the entry, where it used to throw an untranslated zod error; and the language codes accepted are unchanged.

Covered by the existing suites for every package touched (types, types-database, locale, logger, common, load-balancer, all five procaptcha packages, api, cli, api-express-router, server, and the provider's 1322 unit tests), all passing. The built bundle was also loaded in a real browser: the widget renders from the first eight chunks, zod arrives in the second wave, and the provider's error came back translated into German.

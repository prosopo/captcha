---
"@prosopo/api-express-router": patch
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-react": patch
"@prosopo/types-database": patch
"@prosopo/procaptcha-pow": patch
"@prosopo/database": patch
"@prosopo/datasets-fs": patch
"@prosopo/provider": patch
"@prosopo/common": patch
"@prosopo/locale": patch
"@prosopo/env": patch
"@prosopo/cli": patch
---

Decouple error classes from i18n and logging, and move translations into a conventional i18n structure.

- `ProsopoBaseError` and its subclasses no longer translate or log at construction time. They carry a `translationKey` and a fallback `message`; translation happens at the presentation layer (UI render or HTTP response via `unwrapError`).
- Removed the `i18n`, `logger` and `logLevel` constructor options from the error classes; callers log explicitly via their own logger.
- Error keys are validated against the translation files at compile time (`TranslationKey`), and the curated backend error-key registry (`BACKEND_ERROR_KEYS_ARRAY`) is preserved in the frontend bundle.
- Added the translation keys referenced by backend errors to every locale so the locale key sets stay in sync.
- Every error class now takes a required `TranslationKey` as its first argument and an optional causing `Error` via `options.cause` (whose message becomes the fallback). `ProsopoApiError` no longer accepts a raw `Error`. Internal/CLI errors that have no user-facing key use the `GENERAL.UNKNOWN` placeholder with the detail carried in `options.message`.

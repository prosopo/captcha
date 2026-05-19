---
"@prosopo/common": patch
"@prosopo/provider": patch
---

Standardise provider error logging so every error is queryable via a single
top-level `err` field, and so the logged value is the locale-stable
translation key (e.g. `CAPTCHA.NO_SESSION_FOUND`) rather than the translated
message text (`"No session found"`, `"Aucune session trouvée"`, etc.).

- `ProsopoBaseError.logError()` now emits `{ err: translationKey, data: { errorType, context } }` instead of `{ data: { errorType, errorParams: { error, context } } }`. OpenObserve queries can drop `data_errorparams_error` and `data_errorparams_context_translationmessage`.
- The redundant `translationMessage` injection into wrapped-error context is removed (it was the source of the locale-variant strings).
- `NativeLogger.unpackError()` prefers `e.translationKey` over `e.message` when surfacing an error via `logger.error(() => ({ err }))`, so catch-and-log sites are standardised automatically.
- Removed two `console.error` calls in `verify.ts` and an accidental debug `console.log(JSON.stringify(effectiveRules, null, 2))` in `util.ts` that were both bypassing `req.logger` (no `requestId`, and in the JSON dump case exploding into ~20 separate log entries per call).
- HTTP response shape is unchanged: `unwrapError()` still uses `i18n.t(err.message)` for the response body, and `jsonError.key` still carries the translation key for clients.

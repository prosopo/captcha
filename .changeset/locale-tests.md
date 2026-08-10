---
"@prosopo/locale": minor
---

test(locale): unit + type tests, fix empty translation-key schema and i18n load hangs

- `getLeafFieldPath` never emitted a path, because a string leaf returned `[]`
  and the parent mapped over that empty list. `TranslationKeysSchema` was
  therefore an empty `z.enum`, and mongoose registers its enum validator even
  for an empty list — so every non-null `result.reason` failed validation on the
  three solution schemas in `@prosopo/types-database`.
- `loadI18next` wrapped its dynamic imports in a synchronous `try/catch`, which
  cannot see a rejected import or a rejected `changeLanguage`. Those paths left
  the returned promise pending forever instead of rejecting.
- `initializeI18n` only registered its `loaded` listener on the initialisation
  path, so a caller arriving after i18next was already up (or on the client, for
  the backend module) waited on an event that would never fire.
- `loadI18next` now bounds itself with `I18N_LOAD_TIMEOUT_MS` (10s). Resolution
  is event-driven, so a backend that never answers left the promise pending for
  the lifetime of the process. On timeout it resolves with the degraded instance
  — i18next renders the key itself for a missing resource, and neither caller
  handles a rejection — or rejects if no instance was ever created.
- The `process.env` read in `i18SharedOptions` goes through a `getProcess()`
  seam so the browser-runtime path is testable.

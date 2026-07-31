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

---
"@prosopo/locale": minor
"@prosopo/provider": patch
"@prosopo/api-express-router": patch
"@prosopo/server": patch
---

Type-check translation keys on the server and every language file.

- `req.t` and `req.i18n.t` only accept keys from the English catalogue, so a typo fails to compile.
- New `TargetKey`, `targetKeys` and `isTargetKey` for image labels. An image label with no translation now shows the English label (and logs a warning) instead of the raw `TARGET.<label>` key.
- Every language file must have the English file's keys, checked by `typecheck`.
- `@prosopo/server` returns the key instead of `undefined` for its status text when i18next is not initialised.
- Removed the last `@ts-ignore` in `@prosopo/locale`.

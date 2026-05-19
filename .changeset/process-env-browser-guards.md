---
"@prosopo/locale": patch
"@prosopo/util": patch
---

Guard the `process.env` reads in `i18nSharedOptions` and `version` so both
packages are loadable in a plain browser runtime (e.g. Vite dev/preview
servers) where `process` is undefined. Without the guard, any consumer that
side-effectfully imports `@prosopo/types` — which transitively reaches
`@prosopo/locale` via `LanguageSchema` — would crash the page with
`ReferenceError: process is not defined`.

---
"@prosopo/config": patch
---

Keep the server-only i18next backend out of frontend bundles.

`i18next-fs-backend` has been on the frontend config's exclusion list for a long
time, but it was still being bundled. `external` only ever matches a specifier
exactly, and `i18nBackend.ts` imports the subpath `i18next-fs-backend/cjs`
(i18next/i18next-fs-backend#57), which is a different string. So the fs backend
shipped in the browser artifact along with its YAML, JSON5 and JSONC parsers.
`i18next-http-middleware` — Express request handling — was never on the list at
all.

The subpath is now listed literally, and `i18next-http-middleware` joins the
exclusion list.

Both are listed one by one rather than by matching `pkg/*` against the whole
exclusion list. That broader rule looks tidier but is wrong: the `vite` filter
is a substring match, so it also selects `vite-plugin-node-polyfills`, and
`vite-plugin-node-polyfills/shims/process` is injected into the served and IIFE
bundles as a bare import. Externalising it leaves the browser unable to resolve
the specifier and the widget dies on load.

Measured on `@prosopo/procaptcha-bundle`, production mode:

| | before | after |
| --- | --- | --- |
| `i18nBackend` chunk, raw | 153,593 | 788 |
| all chunks, raw | 1,247,449 | 1,094,644 (−12.2%) |
| all chunks, gzip | 474,695 | 434,408 (−8.5%) |

This is not a first-paint change — the critical path is unchanged, because the
chunk is only reachable through `loadI18next(true)` and the widget always calls
`loadI18next(false, language)`. It is dead weight in the published artifact.

No browser behaviour can regress: that chunk already imported `node:path`, which
is already external, so it was never loadable in a browser to begin with. The
i18next packages the browser does use — `http-backend`,
`browser-languagedetector`, `chained-backend`, `resources-to-backend` — are
unaffected and still bundled.

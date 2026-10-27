---
"@prosopo/procaptcha-bundle": patch
---

Fix the classic-script bundle (`procaptcha.bundle.iife.js`), which threw `i18next_http_middleware is not defined` on load and never drew the widget.

The browser build leaves a few server-only modules out (the i18next Express middleware and file backend, `node:path`, `node:url`). An ES module build simply drops an unused import, but an IIFE passes every left-out module into its wrapper as a global variable, and no page defines those. The IIFE build now swaps them for small stubs with the same exports, which throw a clear error only if called.

`bundle:iife` now fails if the built bundle reads any outside global, so this can't ship again unnoticed.

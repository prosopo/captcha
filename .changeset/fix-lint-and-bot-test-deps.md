---
"@prosopo/database": patch
"@prosopo/provider": patch
---

Fix two failures on main.

`biome check` was failing on three files from #3025 — two import orderings and one
line that fits on a single line. Formatting only, no behaviour change.

`@prosopo/prosoponator-bot`'s test suite was failing to load with
`Cannot find module 'undici'`. `@actions/github@6.0.0` calls `require("undici")`
in `lib/internal/utils.js` but does not declare it as a dependency, relying on it
being hoisted. The lockfile only carried undici nested under
`@actions/http-client`, so nothing at the root of `node_modules` could resolve
it. Declaring `undici` on the bot hoists the same 5.29.0 to the root.

This only reproduces in CI. Locally the captcha repo sits inside captcha-private,
whose root `node_modules` has an undici that Node finds by walking up out of the
submodule — so the resolution succeeds on a dev machine and fails on a standalone
checkout.

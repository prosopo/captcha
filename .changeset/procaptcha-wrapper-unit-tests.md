---
"@prosopo/procaptcha-wrapper": patch
---

test(procaptcha-wrapper): add unit test suite and fix script-loading defects

Adds 37 unit tests covering the renderer and the render-script loader, reaching
100% statement, branch, function and line coverage, and wires the package into
`turbo run test` so it runs in CI.

Fixes found while writing them:

- Two concurrent `render()` calls both saw an empty cache and each injected a
  script tag for the same id. The in-flight promise is now cached, not just the
  resolved function, so the script loads once.
- A failed script load left the dead `<script>` tag in the document, so a retry
  appended a second tag carrying a duplicate id.
- A load failure rejected with the raw DOM `Event`, which carries no message and
  breaks any caller reading `error.message`. It now rejects with an `Error`
  naming the url that failed.

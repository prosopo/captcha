---
"@prosopo/cypress-shared": patch
---

Add `ensureInView` option to `cy.snap()` so viewport-scoped snapshots can guarantee the captcha widget is in shot before the screenshot is taken. The baseline-regeneration workflow now also writes an empty changeset so its auto-opened PR passes the changesets check.

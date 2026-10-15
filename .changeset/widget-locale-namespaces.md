---
"@prosopo/locale": minor
"@prosopo/procaptcha-bundle": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-audio": patch
"@prosopo/procaptcha-icon-order": patch
"@prosopo/scripts": patch
---

Split each language's catalogue into `widget.json`, `target.json` and `translation.json`. The widget bundles English and downloads only the active language's `widget.json`. The provider loads all three. Server i18n now finishes loading every file before it reports ready. Removed two broken, unused scripts (`findUnused`, `testImport`) and the dependencies only they used.

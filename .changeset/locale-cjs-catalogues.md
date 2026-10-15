---
"@prosopo/locale": patch
---

Fix server translations when `@prosopo/locale` is loaded with `require`. The CommonJS build looked for its catalogues in `dist/cjs/locales`, which does not exist, so every string came back as its key. It now finds them in `dist/locales`.

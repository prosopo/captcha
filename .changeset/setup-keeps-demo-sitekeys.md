---
"@prosopo/scripts": patch
---

`npm run setup` no longer rewrites the site key in the demo HTML files. It used to rewrite every `data-sitekey` once for each captcha type, so every demo page ended up with the last key registered (puzzle), and the PoW and frictionless demos served puzzle challenges. The demos already read their keys from the `PROSOPO_SITE_KEY_*` env vars at build time, and setup still writes those.

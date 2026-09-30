---
"@prosopo/locale": patch
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-frictionless": patch
---

Fix the error FAQ link and translate two widget strings.

- The error FAQ link no longer ends in `//` when `PROSOPO_DOCS_URL` is set, and a trailing slash on that variable no longer breaks it.
- The "Cannot load CAPTCHA" fallback message now shows in the widget's language.
- The image challenge's reload button now has a translated accessible name instead of always being "Reload".
- Adds `WIDGET.CANNOT_LOAD` and `WIDGET.RELOAD` to every locale.

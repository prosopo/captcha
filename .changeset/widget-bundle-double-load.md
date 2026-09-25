---
"@prosopo/procaptcha-bundle": patch
---

Loading the widget script twice no longer draws a second checkbox in every captcha box. The second copy now does
nothing and leaves the first copy's `window.procaptcha` in place.

If the page already uses `window.procaptcha` for something of its own, the script leaves that alone and logs a warning
instead of overwriting it. Widgets marked with the `procaptcha` class still render.

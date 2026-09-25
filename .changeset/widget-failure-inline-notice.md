---
"@prosopo/procaptcha-common": patch
"@prosopo/procaptcha-bundle": patch
---

A failed challenge no longer opens a blocking, English-only `alert()`. By default the widget now shows the failure message under itself, in the widget's language and with `role="alert"` so screen readers announce it. For an invisible-mode button the message goes beside the button, so the button's label is left alone. The message is removed when the next challenge is solved. Sites that pass a `failed-callback` are unaffected.

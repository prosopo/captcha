---
"@prosopo/procaptcha-frictionless": patch
---

Don't lose an `execute()` call that arrives before the captcha widget has finished loading. Previously, submitting a form quickly on an invisible captcha could do nothing: the widget only starts listening once the provider has answered and its code has loaded, so an earlier `execute()` was dropped and the challenge never opened. The call is now held and replayed as soon as the widget is ready.

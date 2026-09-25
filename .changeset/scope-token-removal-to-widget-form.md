---
"@prosopo/procaptcha-common": patch
---

On a page with more than one captcha (a login form and a sign-up form, say), solving, expiring, resetting or erroring one widget no longer deletes the token another widget already put into its own form. Each widget now only clears the `procaptcha-response` field in its own form, so submitting the first form after completing the second no longer fails verification.

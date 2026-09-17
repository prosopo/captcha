---
"@prosopo/client-bundle-example": patch
---

Fix the demo pages' status log dropping the captcha token. Its `onActionHandler` wrapper took no arguments, so invisible implicit pages (image and frictionless) called the real handler without a token, showed "Must complete captcha" and never submitted the form.

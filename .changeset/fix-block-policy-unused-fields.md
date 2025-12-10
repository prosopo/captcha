---
"@prosopo/user-access-policy": patch
---

Fix: Remove captchaType and solvedImagesCount from block access policies. Block policies should not store these fields as they are only relevant for restrict policies that present captcha challenges.

---
"@prosopo/client-bundle-example": patch
---

Remove the obsolete `captchaType` render option from the client-bundle-example
demos; captcha type is now server-driven per site key, so the prop was a no-op.

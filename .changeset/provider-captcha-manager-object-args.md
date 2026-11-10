---
"@prosopo/provider": patch
---

`CaptchaManager.isValidRequest`, `getVerificationResponse`, `checkForHardBlock` and `resolveTrafficFilterCheck` now take one named-argument object. The image captcha version of `getVerificationResponse` adds `commitmentId` as a named field, instead of slotting it into the middle of the argument list. HTTP requests and responses are unchanged.

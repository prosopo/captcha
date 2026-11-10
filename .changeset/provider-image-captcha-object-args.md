---
"@prosopo/provider": patch
---

The provider's image captcha methods (`dappUserSolution`, `verifyImageCaptchaSolution`, `getRandomCaptchasAndRequestHash`) now take one named-argument object instead of long positional argument lists. `verifyImageCaptchaSolution` takes the site's settings as a single `settings` object. HTTP requests and responses are unchanged.

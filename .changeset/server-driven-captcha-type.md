---
"@prosopo/types": major
"@prosopo/procaptcha-bundle": major
"@prosopo/provider": minor
"@prosopo/keyring": patch
---

Move `captchaType` from client (`data-captcha-type` / render-options prop)
to a server-side site-key setting; the bundle now calls `/frictionless`
for all flows. Default `imageMaxRounds` lowered to 2.

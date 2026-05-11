---
"@prosopo/types": major
"@prosopo/procaptcha-bundle": major
"@prosopo/provider": minor
"@prosopo/keyring": patch
---

Move `captchaType` from client (`data-captcha-type` / render-options prop)
to a server-side site-key setting; the bundle now calls `/frictionless`
for all flows. Renames the bundle's universal mount component from
`FrictionlessCaptcha` to `BundleCaptcha` to reflect that it is no longer
frictionless-specific — the server decides which concrete challenge type
to render.

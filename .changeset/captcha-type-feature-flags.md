---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
"@prosopo/cypress-shared": patch
---

Add `captchaTypeFeatureFlags` to site settings, starting with `puzzle`. Setting
`puzzle: false` stops a site being served the puzzle captcha by any path: its
configured `captchaType`, `frictionlessTypes`, access policies, the traffic
filter, routing machines, PoW escalation, and puzzle sessions that already
exist. A site pinned to puzzle gets an image captcha instead (or PoW if image is
also off). The field is optional and has no stored default, so sites that never
set it behave exactly as before. The flag is meant for Prosopo staff, not site
owners.

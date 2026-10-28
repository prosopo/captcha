---
"@prosopo/types": patch
---

Add a `solver` captcha label, alongside `human`, `bot`, `suspicious` and `unknown`. It marks captchas solved by paid captcha-solving services (2captcha, anti-captcha, CapMonster), whose workers are often real people paid to solve, so neither `bot` nor `human` fits. Stored records accept the new value; existing labels are unchanged.

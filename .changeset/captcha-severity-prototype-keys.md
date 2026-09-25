---
"@prosopo/captcha-severity": patch
---

Rank a captcha type named after a built-in object property, such as `constructor` or `__proto__`, at 0 like any other unknown type.

The tier table was a plain object, so those names read a function or object off Object.prototype instead of missing. `rankCaptchaType("constructor")` returned a function and `captchaPolicySeverity` returned a string, which broke every strictness comparison it took part in. The table is now a Map.

---
"@prosopo/util": patch
"@prosopo/database": patch
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/locale": patch
---

Validate salt-encoded coords in PoW and puzzle verification and add a `CAPTCHA_INVALID_SALT` result reason. Invalid input now produces a disapproval rather than a partial write.

---
"@prosopo/util": patch
"@prosopo/database": patch
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/locale": patch
---

Auto-fail PoW / puzzle verification when the client-supplied salt decodes to invalid coords (NaN, ±Infinity, non-integer, negative, or above MAX_PIXEL_COORD). Adds a `CAPTCHA_INVALID_SALT` result reason, makes `extractData` reject any unsafe-integer parse, and asserts coord safety in the DB update path so adversarial values cannot reach Mongo. Previously a crafted hex salt produced `coords = [[[NaN, …]]]` which landed in the provider's local DB unchecked and then crashed the central-DB streamer's `[[[Number]]]` cast.

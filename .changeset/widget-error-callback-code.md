---
"@prosopo/locale": minor
"@prosopo/procaptcha": minor
"@prosopo/procaptcha-common": minor
"@prosopo/types": minor
"@prosopo/procaptcha-audio": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-icon-order": minor
"@prosopo/procaptcha-puzzle": minor
---

A site's error-callback now gets an Error that also has `code` and `errorId`, so sites can branch on the code and log the id. `message` still works as before.

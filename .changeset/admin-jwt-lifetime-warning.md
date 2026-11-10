---
"@prosopo/api-express-router": patch
"@prosopo/util-crypto": patch
---

When an admin token is turned away only because it lives longer than the allowed maximum, the provider now logs a warning with the token's subject, its lifetime and the maximum. Such a token can never pass, so it is a setup mistake on the caller's side, but until now it looked the same in the logs as a wrong password. The warning is logged once per subject, and only after the token's signature has been checked, so nothing from a forged token reaches the logs. The request is still answered 401.

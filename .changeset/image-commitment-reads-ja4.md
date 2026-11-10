---
"@prosopo/database": patch
---

Image captcha verification now reads the TLS fingerprint (`ja4`) of the stored solution. It was left out of the fields fetched for the verify step, so access rules scoped to a TLS fingerprint and set to apply at verification never matched image captcha solves, though they did for the other captcha types. Image solves that match such a rule now fail verification.

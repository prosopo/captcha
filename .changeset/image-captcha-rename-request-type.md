---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": patch
---

Every stored session and captcha record now carries a `requestType` field (`session`, `powcaptcha`, `imagecaptcha`, `puzzlecaptcha`, `audiocaptcha` or `iconordercaptcha`), filled in automatically when the record is written. Records stay in their existing collections and older records without the field still load. This is the groundwork for later moving them all into one collection.

Image captcha records are now called `ImageCaptcha` in code instead of `UserCommitment`. The old type and schema names still work but are deprecated. The provider database methods were renamed without aliases (for example `approveDappUserCommitment` is now `approveImageCaptcha`), and `getCaptchas` now returns `imageCaptchaRecords` instead of `userCommitmentRecords`. The Mongo model and collection names are unchanged, so no data migration is needed.

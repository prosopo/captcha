---
"@prosopo/user-access-policy": minor
"@prosopo/captcha-severity": minor
"@prosopo/provider": patch
---

Access rules have a new `severity` field that sets how hard a puzzle rule's puzzle is. Puzzle rules used to carry this in `solvedImagesCount`, an image round count, which read like a mistake on a puzzle rule. The provider and the rule ranking now read `severity` first and fall back to `solvedImagesCount`, so rules already stored keep working. Block rules reject `severity`, as they already reject `solvedImagesCount`.

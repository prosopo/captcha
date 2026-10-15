---
"@prosopo/locale": minor
"@prosopo/types": minor
"@prosopo/common": minor
"@prosopo/provider": minor
---

Image challenges now send each label's key (`targetKey`) and English text (`targetEn`) beside the translated `target`, and say which `language` they were translated into. Error responses add `messageEn` when the widget has no text of its own for the error's key. All new fields are additive. New `englishText(key)` in `@prosopo/locale`.

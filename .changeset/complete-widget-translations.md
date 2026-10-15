---
"@prosopo/locale": minor
"@prosopo/procaptcha-react": patch
---

Fill in the missing and wrong translations across all 32 widget languages and add a generic Chinese (`zh`) catalogue.

- Every language now has the audio-challenge strings, which were English everywhere before.
- Image labels that had been machine-translated wrongly (for example Hungarian "camel" as "cow", Thai "rhinoceros" as "gibbon") or left as hyphenated keys ("hot-air-balloon") now read as proper words.
- Turkish, Ukrainian, Malay, Indonesian, Javanese, Azerbaijani, Finnish, Romanian, Thai and Malayalam were largely rewritten. Corrupted Serbian characters were fixed.
- The "Select all …" prompt now ends with its own colon in each language (" :" in French, "：" in Chinese and Japanese), so the widget no longer appends an English colon.
- `Languages.chinese` is now `zh`. The existing `zh-CN` catalogue is still available as `Languages.chineseChina`.
- A new `locales` CI check fails a PR whose catalogues have missing or extra keys, empty or untranslated values, the wrong script, or broken characters.

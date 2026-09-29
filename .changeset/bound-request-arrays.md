---
"@prosopo/types": patch
---

The request schemas now cap the arrays that callers can send: at most 10,000 `puzzleEvents` on a puzzle solution, 256 `captchas` on an image solution, 64 `solution` entries per captcha, and 64 entries in a byte-array `datasetId`. A request over a cap fails validation straight away, without checking each element first. Before, the arrays had no limit, so one 1 MB request could hold about 150,000 items for the provider to validate, store and echo back. The caps are well above what the widget sends: it records one puzzle event per pointer move during a drag, an image challenge has at most 32 rounds by default, and each captcha has 9 images.

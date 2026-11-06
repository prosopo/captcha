---
"@prosopo/provider": patch
"@prosopo/util": minor
---

Traffic filter name lists now match provider names whatever their punctuation, spacing or accents. An allowlist entry of `Example Hosting,Inc.` used to miss IPs that upstream reports as `Example Hosting , Inc.`, so users on one range of a provider were let through while users on another range of the same provider were still blocked. Names are now reduced to their letters and digits before comparing, with accents and full-width characters folded, so both spellings match. Names in non-Latin scripts still compare as before.

`@prosopo/util` now exports `normaliseForMatching`, the helper that does this, so other code that compares free-text names can use the same rules.

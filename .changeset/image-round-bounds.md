---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Per-sitekey `imageMinRounds` alongside the existing `imageMaxRounds`, and a real staleness curve behind `timestampDecayFunction`.

Every source of an image round count — access-policy rules, traffic-filter categories, routing machines, and the provider's own heuristics — is now clamped into `[imageMinRounds, imageMaxRounds]` via `clampImageRounds`, so the sitekey's settings override its rules in both directions rather than only capping them. `imageMinRounds` defaults to 2, matching the floor that was previously hard-coded, so existing sitekeys are unaffected.

`timestampDecayFunction` used `new Date().getTime()` as both the score ceiling and the decay denominator, which reduced the exponential term to a rounding error: it returned 3 rounds for every session under an hour old and `min(imageMaxRounds, 12)` beyond, with none of the decay its name promised. It now interpolates linearly from 3 rounds at 10 minutes to 12 rounds at an hour, preserving both endpoints. An unreadable timestamp is treated as fully decayed instead of returning `NaN`.

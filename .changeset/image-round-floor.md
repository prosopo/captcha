---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Per-sitekey `imageMinRounds` alongside the existing `imageMaxRounds`.

Every source of an image round count — access-policy rules, traffic-filter categories, routing machines, the staleness curve, and the provider's own heuristics — is now clamped into `[imageMinRounds, imageMaxRounds]` via `clampImageRounds`, so the sitekey's settings override its rules in both directions rather than only capping them. `imageMinRounds` defaults to 2, matching the floor that was previously hard-coded, so existing sitekeys are unaffected.

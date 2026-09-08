---
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Default `trafficFilter.abuserScoreThreshold` to 0.2.

The mongoose default was `0`. The abuser score runs 0..1 with 0 meaning "clean", so a `0` threshold applies the `abuser` category to every IP carrying any non-zero score, which is the widest the field can be set. A site that had never opened the traffic filter got that by default.

`trafficFilterAbuserScoreThresholdDefault` moves from 0.5 to 0.2 and `@prosopo/types-database` now reads it instead of its own literal, so the zod default, the mongoose default and the provider's runtime fallbacks (`checkTrafficFilter`, `enrichDnsEvent`) all resolve to one number.

`trafficFilter` is optional on `ClientSettingsSchema` and no create-site path sends one, so the mongoose default is what a new site key actually gets — the zod default only applies once a caller supplies a `trafficFilter` object.

Existing sites keep whatever value is stored; only records with no value are affected.

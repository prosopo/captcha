---
"@prosopo/types-database": patch
---

fix: declare the puzzle render settings on the mongoose user-settings schema

`UserSettingsSchema` never declared the `puzzle` block that
`ClientSettingsSchema` has carried since the puzzle render tunables shipped.
Mongoose is strict by default, so every site-wide override — decoy count,
decoy edge/body shading, hole darken, decoy hole darken, piece scale — round
tripped through zod, reached the database and was silently dropped on write.
The same omission on `TrafficCategoryPolicySchema` did the same to the
per-category puzzle overrides a traffic-filter challenge can carry.

Identical failure mode to `frictionlessTypes`, which carries the comment
explaining it. Bounds mirror the zod field schemas, and the block has no
default so an unconfigured site stays free of an empty subdocument rather
than gaining one on every save.

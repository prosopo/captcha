---
"@prosopo/provider": patch
---

Convert the `clientSettingsPersistence` integration test's `trafficFilter` assertion from a single `toMatchObject` to per-field `expect` calls. Matches the convention already used for top-level settings fields so a future regression that drops one of the trafficFilter sub-fields will surface the specific field name in the failure rather than dumping the whole nested object diff.

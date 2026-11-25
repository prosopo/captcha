---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
---

Adds an `alwaysPass` client setting. When it is on, every submit and verify for that site key reports a pass, with no score, reason or escalation. The real result is still recorded, and verify only applies the setting after the site key's signature checks out. Forced passes are logged and counted under the `always_pass` verify metrics source.

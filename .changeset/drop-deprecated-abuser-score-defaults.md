---
"@prosopo/types": minor
"@prosopo/types-database": patch
"@prosopo/cli": minor
---

The deprecated `trafficFilter.abuserScoreThreshold` and `ipValidationRules.abuseScoreThreshold` no longer get a default, so they are no longer filled in on records that don't have them. Neither has been read for decisions since the reputation score replaced them; stored values still parse. The `abuserScoreThreshold` migration command, which only wrote that field, is removed.

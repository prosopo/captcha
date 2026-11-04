---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/ipinfo": minor
"@prosopo/provider": minor
---

The traffic filter's `abuser` category, its exceptions, the DNS-path signal and the IP validation rules now use the IP lookup's reputation score.

- The IP lookup carries `reputationScore` and `reputationBand`. An address without a score never meets a threshold.
- New settings: `trafficFilter.reputationScoreThreshold`, exception `minReputationScore`, and `ipValidationRules.reputationScoreThreshold`.
- `abuserScoreThreshold`, `minAbuserScore` and `ipValidationRules.abuseScoreThreshold` are deprecated. Stored records still parse, and an exception that has only `minAbuserScore` keeps its current behaviour until it is updated.

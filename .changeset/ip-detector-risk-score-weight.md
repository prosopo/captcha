---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/ipinfo": minor
"@prosopo/provider": minor
"@prosopo/cli": minor
---

The IP lookup now reads a detector risk for the address (a number from 0 to 1, or nothing when there is no evidence) and keeps it on the lookup result, so it is saved with the session's IP info and written to the frictionless decision log next to the session's own bot score.

Sites get a new setting, `ipDetectorRiskWeight` (0 to 1, default 0). When it is above 0, the frictionless flow adds weight × risk to the bot score, capped at 1, before comparing it with the site's thresholds. It can only change which challenge is served; it never blocks. The amount added is recorded in the session's score components, and the log shows the score before and after. At the default of 0 nothing changes.

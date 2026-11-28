---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
---

The Protect challenge-page Referer check is now a per-site detection rule action (`detectionRuleActions.protectChallengeReferer`) instead of a hard 401 for every site. By default it only records the match on the session as a shadow rule; a site can set it to off, challenge (the site's hardest image captcha) or deny. Shadow matches saved when a challenge is issued are kept when verify adds its own.

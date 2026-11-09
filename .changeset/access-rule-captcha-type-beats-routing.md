---
"@prosopo/provider": patch
---

An access rule that names a captcha type now always gets that type. Before, the routing machine ran after the rule and could swap it, so a rule set to image could serve a puzzle while the session still recorded the image rule as the match. The enabled-type check and the user's own switches still apply after the rule. A reused session that matches such a rule is no longer evicted just because the routing machine would pick a different type.

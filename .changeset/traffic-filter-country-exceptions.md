---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
---

Traffic filter categories can now have exceptions. Each exception matches on the visitor's country, a minimum abuser score, or both, and replaces the category's block or challenge action when it matches. The first matching exception wins. For example, you can challenge UK proxies and block all others, or block UK proxies with an abuser score of at least 0.5 and challenge the rest.

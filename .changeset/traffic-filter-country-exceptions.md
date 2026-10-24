---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": minor
---

Traffic filter categories can now have exceptions. An exception matches visitors by country, by whether their country is inside or outside the account's market, by a minimum abuser score, or any mix of these. It then replaces the category's block or challenge action. The first matching exception wins. For example, you can challenge proxies from the account's market and block all others, or block UK traffic with an abuser score of at least 0.5 and challenge the rest.

The account's market countries now travel to providers inside each site's traffic filter, including when a provider pulls updated sites from the portal database. An exception that depends on the market never matches while the account has no market set.

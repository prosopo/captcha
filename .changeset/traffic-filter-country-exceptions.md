---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": minor
"@prosopo/captcha-severity": minor
---

Traffic filter categories can now have exceptions. An exception matches visitors by country, by whether their country is inside or outside the account's market, by a minimum abuser score, or any mix of these. It then replaces the category's block or challenge action. When several exceptions match, the harshest wins: a block beats any challenge, and a stricter captcha beats a milder one. So the order of the list does not matter. For example, block proxies, but challenge those from the account's market unless their abuser score is at least 0.5.

The account's market countries now travel to providers inside each site's traffic filter, including when a provider pulls updated sites from the portal database. An exception that depends on the market never matches while the account has no market set.

`@prosopo/captcha-severity` gains `policyHarshness` and `harshestPolicy`. They rank a policy that may block, and the access rules now use them too, with the same ordering as before.

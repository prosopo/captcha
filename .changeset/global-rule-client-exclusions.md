---
"@prosopo/user-access-policy": minor
"@prosopo/provider": minor
---

Global access rules can now name clients they don't apply to.

A rule with no `clientId` used to apply to every site with no exceptions, so the only way to spare one customer from a platform-wide ban was to delete the ban for everyone. Rules now take an optional `excludedClientIds` list. A request from a listed site skips that global rule, while the site's own rules and every other site are unaffected. The insert API accepts the list on a rule group.

The list is indexed in Redis so the request-time lookup drops the rule before it is fetched, and `rankCandidateRules` checks it again in code. It is left out of the rule's key hash, so changing the list rewrites the same rule instead of leaving the old version enforcing the old list. Re-pushing a rule without a list clears any list it had.

Providers that predate this change ignore the field and treat the rule as a plain global rule. Deploy the providers before anything starts writing exclusions, or the excluded sites stay blocked until they are updated. The rule index schema changes, so each provider rebuilds its index on startup.

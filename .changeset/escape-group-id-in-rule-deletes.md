---
"@prosopo/user-access-policy": patch
---

Deleting access rules by group now works when the group id contains a hyphen, and a failed delete is reported as a failure.

The group id went into the redis search unescaped, so a group such as `example-rule-group` made the search a syntax error. The error was swallowed and the provider answered that it had deleted nothing, which the rule push counted as success: the rule stayed live on the provider while its record was removed from the portal. The search now escapes the group id, and a search that errors makes the delete fail so the push retries it.

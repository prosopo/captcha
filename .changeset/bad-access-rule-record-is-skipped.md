---
"@prosopo/user-access-policy": patch
---

An access rule with an invalid IP address or IP range is now reported as a validation error instead of throwing. Reading rules from Redis also skips a record whose parsing throws, so one bad record no longer makes the whole lookup return no rules, and the rules API answers such a value with a 400 rather than a 500.

---
"@prosopo/user-access-policy": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
"@prosopo/types": patch
---

Record the access rule that actually fired on the record it acted on, so the
audit page can name the exact policy behind a block rather than echoing its
optional free-text description.

Access rules are ephemeral — client rules carry a TTL and are reaped by
Mongo's `expiry` index — so an audit row can't answer "which policy blocked
me?" by joining to the live rules collection: by the time anyone looks, the
rule is usually gone. `describeMatchedRule` snapshots the matched rule (policy
type, captcha type, `deferToVerify`, description, rule group, and its scope
conditions in record form) onto `Session.matchedRule` at enforcement time.

Previously only the request-time block middleware recorded any rule identity,
and only as a hash, a field-name list and a description. It is now written by
every access-policy path: the block middleware, the frictionless entry (block,
auto-ban, forced captcha type, and score-only restrict alike), and the
verify-time hard-block check in the PoW / image / puzzle flows — which is where
`deferToVerify` rules land, and where "why was I rejected?" was least obvious.

`checkForHardBlock` now returns the whole `AccessRule` rather than just its
policy half; the runtime value was always the full rule.

---
"@prosopo/user-access-policy": patch
"@prosopo/provider": patch
---

Add a `browser` match dimension to access rules.

Rules can now be scoped to the browser classified server-side from the request
User-Agent (`chrome`, `safari`, `firefox`, `edge`, `opera`, `samsung_internet`,
`wechat`, `facebook`, `instagram`, `ie`, `unknown`), mirroring the existing `os`
dimension. The classifier duplicates `@prosopo/decision-machines`' `uaClassify`
because the provider request path cannot depend on that package.

Also fixes `os` never getting its own probe on the Redis split-query hot path:
`SCALAR_USER_SCOPE_FIELDS` in `redisRulesSplitQuery` had not been updated when
the OS dimension landed, so an OS-only rule was reachable only via the
`no-user-scope` fall-through, competing for that probe's candidate budget
against genuine client-wide blocks.

The Redis index gains a `browser` TAG field, so the access-rules index needs
rebuilding on deploy.

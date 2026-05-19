---
"@prosopo/user-access-policy": patch
---

User Access Policy (UAP) rule endpoints now use the per-request logger
passed by the express adapter, instead of the long-lived app logger
captured at construction time. This means every "Endpoint inserted access
rules" / "Endpoint fetched rules" / "Endpoint deleted rules" / etc. log
line now carries `requestId`, `siteKey`, and `user`, matching the rest of
the provider API and making the logs queryable per-request in OpenObserve.

Each `processRequest(args, logger?)` resolves to the request logger when
present and falls back to `this.logger` otherwise, preserving behaviour
when called directly (e.g. from a script or unit test that doesn't pass
a logger). The express adapter at
`api-express-router/.../apiExpressDefaultEndpointAdapter.ts` already
passes `request.logger` — no router-level changes needed.

Touched endpoints (all under `packages/user-access-policy/src/api/`):
`InsertRulesEndpoint`, `RehashRulesEndpoint`, `FetchRulesEndpoint`,
`FindRuleIdsEndpoint`, `GetMissingIdsEndpoint`, `DeleteRulesEndpoint`,
`DeleteAllRulesEndpoint`, `DeleteRuleGroupsEndpoint`.

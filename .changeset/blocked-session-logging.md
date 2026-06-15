---
"@prosopo/provider": minor
"@prosopo/database": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
---

Log + persist access-policy block decisions. When `blockMiddleware` 401s a request, the inspector now emits a structured `"Access policy block"` log line carrying the matched rule's identity (`ruleHash`, `ruleType`, `ruleDescription`, `policyType`) and the request's user-scope (ja4 / ip / userAgent / userId / countryCode / asn), and writes a synthetic `Session` record with `blocked: true`, `deleted: true`, `reason: ACCESS_POLICY_BLOCK`, and the same rule fields surfaced on three new optional columns (`ruleHash`, `ruleType`, `ruleDescription`). Persistence is fire-and-forget and any Mongo failure is swallowed-and-logged so the 401 response is never delayed. The new fields are gated by `blocked: true` so legit sessions stay untouched, and two sparse indexes (`{siteKey, blocked, createdAt}`, `{ruleHash}`) keep the per-rule and per-client block aggregations the Traffic page will query off the existing sessions collection without bloating the index on normal traffic.

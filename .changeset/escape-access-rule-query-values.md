---
"@prosopo/user-access-policy": patch
---

Access-rule lookups now escape every value they put into a Redis search query: the site key, the user id, the group id and every other request field. Before, only `coords` was escaped. The site key and user id come straight from request headers or the body, so a value such as `x} | @clientId:{other` could change which rules the query matched, and a value with a `-`, `.` or space made the query a syntax error. The lookup treats a failed query as "no rules", so either case let a request skip a block rule. Escaped values match exactly what was stored, so existing rules are still found.

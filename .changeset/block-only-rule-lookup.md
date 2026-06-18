---
"@prosopo/user-access-policy": patch
"@prosopo/provider": patch
---

Add an indexed `type` field on the access-rules Redis index and a `blockOnly` filter on `findRules`. The request-time block middleware and the verify-time hard-block check now pre-filter the candidate pool to Block rules at the Redis layer, so dense Restrict / routing-Block populations can no longer push hard-block rules past the server-side ranking cap. Schema rehash triggers automatic index recreate on next provider start.

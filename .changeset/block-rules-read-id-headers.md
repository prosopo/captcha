---
"@prosopo/provider": patch
---

Request-time access rules scoped to a user or a site key now also apply when the request carries those ids only in the `Prosopo-User` and `Prosopo-Site-Key` headers. The check looked the headers up by their capitalised names, but Node lower-cases header names, so it only ever saw ids sent in the request body. The body still takes precedence when it has them.

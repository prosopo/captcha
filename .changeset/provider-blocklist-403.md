---
"@prosopo/provider": patch
---

Return `403 Forbidden` (was `401 Unauthorized`) for requests denied by the
blocklist / access-policy block middleware. The client isn't lacking
credentials — it is denied access — so 403 is the correct status. The response
body changes from `{ "error": "Unauthorized" }` to `{ "error": "Forbidden" }`.

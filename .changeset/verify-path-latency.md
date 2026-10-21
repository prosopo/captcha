---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/ipinfo": patch
"@prosopo/env": patch
---

Server-side verify (what siteverify calls) now does far less waiting. A PoW verify used to make about 19 database and ip-lookup calls one after another; it now makes about 6, and a rejected verify about 3. Changes:

- The ip lookup that runs on every request is skipped on verify routes. Nothing on verify used it, and the caller there is the site's server, not the user.
- The session record is read once instead of twice, and the client record once instead of twice.
- The session read, DNS enrichment and the user's ip lookup run alongside the access-rule check instead of one after another, and are skipped once a check has already failed.
- The verify answers without waiting for its two bookkeeping writes. The single-use claim is still made before anything else, so a token still verifies only once.
- Decision-machine artifacts are cached per process. They were cached per request, so every verify read them from Mongo.
- Client records are cached for 30 seconds and the cache is cleared by every client-record write in the process.
- Successful ip lookups are cached for 10 minutes, so an address is not looked up twice in one verify, or again at verify after the challenge looked it up.


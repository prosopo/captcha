---
"@prosopo/provider": patch
---

Admin route rate limits now only use the token's subject as the counter key once the token's signature has been checked against an admin key. Requests with a token that does not verify are counted against their IP. Before, the subject was read from the token without checking it, so a caller could pick a new subject on every request and never hit the limit. `getUserFromJWT` is removed; it read the subject without verifying it and had no other users.

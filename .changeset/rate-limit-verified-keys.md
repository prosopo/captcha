---
"@prosopo/provider": patch
---

Rate limits are no longer keyed on values a caller can change freely. Admin routes were limited per the `sub` claim of the bearer token before the token was checked, so a caller could get a fresh budget for each made-up `sub`. They are now limited per admin account only when the token's signature is valid, and per IP address otherwise. The verify routes were limited per `prosopo-site-key` header only, so rotating the header gave unlimited verifies. They keep the per-site-key limit and now also have a per-IP limit of twice the route's limit (`PROSOPO_VERIFY_IP_RATE_LIMIT_MULTIPLIER`). The puzzle verify route now gets the same limits as the image and PoW verify routes.

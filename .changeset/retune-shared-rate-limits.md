---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/user-access-policy": patch
---

Default API rate limits are doubled. They are now counted once per node rather than once per container, so this keeps the allowance clients had before. Verify and siteverify limits count against a site key only once the request's signature or secret proves it belongs to that site, and against the caller's IP otherwise.

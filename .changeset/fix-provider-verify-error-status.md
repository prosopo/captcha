---
"@prosopo/provider": patch
---

Preserve original error status codes in the image/pow/puzzle verify routes. Errors that already carry a status (e.g. a 401 `INVALID_SIGNATURE` or a 400 validation error) are now forwarded unchanged instead of being wrapped as a 500.

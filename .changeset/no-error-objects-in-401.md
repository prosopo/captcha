---
"@prosopo/api-express-router": patch
"@prosopo/provider": patch
---

401 responses no longer include server internals. The admin auth check returned the whole error object, which included the request's i18n instance with its settings and file paths (about 16 KB per response), or whatever a failing check had thrown. It now returns `{ error: { code: 401, key, message } }`, the same shape as other API errors. The domain check returned unexpected errors, such as database errors, in the response body. It now returns a fixed message and logs the error.

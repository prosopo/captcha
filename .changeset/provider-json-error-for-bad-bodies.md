---
"@prosopo/provider": patch
---

A request whose body is malformed JSON, too large, or in an unsupported encoding now gets the API's normal JSON error (`{ error: { code, message, ... } }`) with the same status as before (400, 413, 415). Before, these errors skipped every router's error handler and reached Express's default handler, which answered with an HTML page (including a stack trace outside production).

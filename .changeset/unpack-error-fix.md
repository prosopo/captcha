---
"@prosopo/logger": patch
---

Replace hardcoded field allowlist in unpackError with Object.getOwnPropertyNames so all custom subclass fields are captured automatically. Fixes duplicate cause assignment and updates errData type.

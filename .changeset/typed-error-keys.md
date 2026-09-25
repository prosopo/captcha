---
"@prosopo/common": patch
---

Error classes now only accept error keys that exist in the English translation catalogue, so a misspelt key such as `DATABASE.DATABASE_IMPORT_ERROR` fails to compile instead of showing the raw key to users.

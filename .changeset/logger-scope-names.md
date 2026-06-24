---
"@prosopo/api-express-router": patch
"@prosopo/cli": patch
"@prosopo/common": patch
"@prosopo/database": patch
"@prosopo/datasets": patch
"@prosopo/datasets-fs": patch
"@prosopo/dotenv": patch
"@prosopo/provider": patch
---

Replace vague logger scopes (empty strings, import.meta.url, generic "CLI") with structured colon-delimited names following the convention package:subsystem:action.

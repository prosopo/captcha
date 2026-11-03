---
"@prosopo/database": patch
---

Mongo connection URLs in logs now hide the username and password properly. The old redaction replaced the first `word:word` it found, so a password containing a `-` (which every password `generateSelfHostedEnv.ts` creates can) was logged in full or in part, with the host and port hidden instead. URLs without credentials no longer lose their host and port either.

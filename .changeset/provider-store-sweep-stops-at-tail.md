---
"@prosopo/provider": patch
---

Stop the job that copies captcha records to the central database from getting stuck on busy nodes.

Each part of the job now stops when it reaches the end of the records waiting at that moment, instead of chasing new ones as they arrive. On a busy node it could spend over an hour on proof-of-work records and never reach sessions, so session results stopped reaching the central database.

The job also no longer starts a second copy while the first is still running in the same process. The two copies shared one connection and closed it under each other, so most runs failed.

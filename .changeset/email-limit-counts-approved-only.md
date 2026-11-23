---
"@prosopo/database": patch
---

The per-email submission limit now counts only approved verifications. Refused attempts, including ones refused by the limit itself, no longer use up an address's allowance, so a person who retries after a failure is not locked out permanently.

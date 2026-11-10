---
"@prosopo/types": patch
---

The PoW challenge id schema now fails validation for a missing or non-string value instead of throwing, so the 400 response lists the validation issues.

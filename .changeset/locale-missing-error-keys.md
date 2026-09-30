---
"@prosopo/locale": patch
"@prosopo/database": patch
---

Every error key the code throws now has a translation. Twelve keys were missing from the catalogue, so users and logs saw the raw key: ten thrown keys plus the `CAPTCHA.INVALID_TIMESTAMP` and `CAPTCHA.DECISION_MACHINE_DENIED` result reasons. They are added to all 32 locales. The database import error threw `DATABASE.DATABASE_IMPORT_ERROR`, a typo for the existing `DATABASE.DATABASE_IMPORT_FAILED`. A new test fails if an error is thrown with a key that is not in the catalogue.

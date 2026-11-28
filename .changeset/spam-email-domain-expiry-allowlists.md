---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": minor
"@prosopo/cli": minor
---

The spam email domain sync now records which lists carry each domain. A domain no list has carried for 14 days (`SPAM_EMAIL_DOMAINS_EXPIRY_DAYS`) is removed, and domains on the allowlists (`SPAM_EMAIL_DOMAINS_ALLOWLIST_URLS`, plus rows marked `allow`) are never flagged. If a list shrinks by more than half, nothing expires that run. Hand-added domains are left alone. Two new CLI options: `update_spam_email_domains --dryRun` and `spam_email_domain_set --domain <d> --kind block|allow`.

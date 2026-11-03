---
"@prosopo/cli": patch
"@prosopo/provider": patch
---

The provider CLI now exits with code 1 when a command fails, and 0 only when it succeeds. Before, most failures were logged and the process still exited 0, so scripts and ansible could not tell that a site key, dataset or index had not been written. This covers unknown commands, missing or invalid arguments, bad input, unreachable databases and failed writes, and a provider started with `--api` that cannot boot.

Some commands that used to do nothing quietly now fail with a reason: `store_captchas` and `ensure_external_indexes` without `PROSOPO_MONGO_CAPTCHA_URI`, and `update_spam_email_domains` without `SPAM_EMAIL_DOMAINS_URLS`. `ensure_external_indexes` now connects to the captcha database before creating indexes; before, it always skipped them. `ensure_indexes` no longer needs `PROSOPO_MONGO_CAPTCHA_URI`, which it never used. `site_key_register_api` takes `<sitekey> <tier>`, as its README says, with `--url` as a flag.

`storeCommitmentsExternal` now rethrows after recording the failed task, so the CLI can see it. The scheduler already catches it.

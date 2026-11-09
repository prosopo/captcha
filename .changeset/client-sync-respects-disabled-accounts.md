---
"@prosopo/database": patch
"@prosopo/provider": patch
"@prosopo/types-database": patch
---

The scheduled client sync no longer brings back site keys from disabled accounts or deleted sites. It used to copy any recently edited site to the provider, so disabling an account or deleting a site shortly after an edit was undone on the next run. The sync now skips those sites and removes their keys from the provider on every run, so a disabled account stays off even if the direct removal call failed. Removing keys that are not stored no longer empties the client record cache.

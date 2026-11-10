---
"@prosopo/database": patch
---

The client sync now picks up a site that has no `updatedAt` even when the other sites on its account are older than the sync cutoff. Before, the account query only matched an unstamped site when no site on the account had an `updatedAt` at all, so that site's settings stopped reaching providers once its siblings had been synced.

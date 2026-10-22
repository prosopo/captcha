---
"@prosopo/provider": patch
---

The image challenge endpoint now rejects a client `datasetId` that is not a hex hash, such as an empty string or a number array, with a 400 before it looks anything up in the database. Before, it first fetched the site's client record and only then rejected the value. Leaving out `datasetId` still falls back to the provider's default dataset.

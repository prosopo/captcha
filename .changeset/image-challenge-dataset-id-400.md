---
"@prosopo/provider": patch
---

The image challenge endpoint now answers 400 when a client sends a `datasetId` that is not a hex hash, such as a plain string or a number array. Before, the value went on to the dataset lookup, failed in the database layer and came back as a 500. A large number array was also logged in full several times and kept the event loop busy for many seconds per request. Leaving out `datasetId` still falls back to the provider's default dataset.

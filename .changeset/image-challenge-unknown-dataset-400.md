---
"@prosopo/provider": patch
---

The image challenge endpoint now answers 400 `DATABASE.DATASET_GET_FAILED` when the caller sends a `datasetId` that is not a stored dataset: an unknown hex id, a non-hex string or a byte array. Before, the id was only looked up once challenge generation had started, so a bad id came back as a 500. The response does not echo the id. If looking up the dataset fails for another reason, such as the database being unreachable, the endpoint still returns 500. Requests that leave `datasetId` out still use the provider's default dataset.

---
"@prosopo/common": patch
---

Add a Rust port of the `ProsopoError` hierarchy, `unwrapError` and the batch helpers, for the upcoming Rust provider service. Errors log the same lines and turn into the same API error bodies as the TypeScript. The TypeScript package is unchanged.

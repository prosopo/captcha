---
"@prosopo/procaptcha-react": patch
"@prosopo/datasets": patch
"@prosopo/provider": patch
---

Make asset signing survive contact with a CDN that actually enforces it.

Signing image URLs is optional and has been off in practice, so two paths that only break when a zone starts checking tokens have never been exercised. Both are fixed here, so enabling enforcement is a config change rather than a config change plus an incident.

**A dataset could not be imported.** Hashing an item downloads the image from the URL stored in the dataset, and that URL is the canonical, unsigned one. Against an enforcing zone every one of those downloads is rejected, so a dataset becomes impossible to import on exactly the configuration it is meant to be served from. `downloadImage` now signs the URL when a signing key is configured, and leaves it alone when one is not.

**A failed image never recovered.** The widget retried a broken image by appending a cache-busting query parameter. A token is a signature over the query string, so on a signed URL that parameter invalidates it and every retry is rejected — a transient failure turned permanent. The retry now re-requests the signed URL unchanged, and keeps the cache-buster for unsigned URLs, where it is still worth having and costs nothing.

The token scheme itself now lives in one place, `@prosopo/datasets`, rather than being written out twice. The provider keeps its synchronous implementation, because `resolveAsset` cannot await, but both ends build the string to hash and encode the result through the same helpers.

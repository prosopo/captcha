---
"@prosopo/provider": minor
---

Seal captcha image paths into opaque URLs, opened by a CDN edge script.

An image URL used to say which image it was: `https://cdn.example.net/dataset/images/abc.webp`. Signed URLs already stop a harvested URL being refetched forever, but the path stays in plain sight, and the path is a stable identifier for the image behind it — which makes it a usable key for caching answers between sessions.

The path is now AES-256-GCM sealed, with an expiry, into an opaque blob drawn fresh every time:

```
https://cdn.example.net/s/AgHk1n...Qx9.webp
```

The edge script opens it, puts the canonical path back on the request, and the CDN serves the one object that path names. The same image therefore has a different URL in every session, with nothing in the URL to group those together, and there is still only one cached copy and one stored object.

Sealing happens strictly below `item.data`. The item hash, the captchaId and the datasetId are untouched, so nothing about the dataset or how a solution is verified changes.

The provider seals with `node:crypto`, because `AssetsResolver.resolveAsset` is synchronous and every WebCrypto call returns a promise; the edge opens with WebCrypto, because that is what its runtime has. The wire format, the validation and the base64url alphabet live in one module both ends import, and a test seals with one end and opens with the other so the two cannot drift.

Inert unless its key is configured, since a sealed URL is unservable until the matching edge script is live. Configured, it takes precedence over the signed resolver; leaving the signing key in place keeps that as the fallback for any zone not yet moved over. More than one key opens at a time, so keys can be rotated without a flag day. `npm run -w @prosopo/provider build:edge` emits the edge script as a single file. Rollout order, environment variables and rotation are documented for operators outside this repository.

Test coverage: 51 unit tests over the wire format, the sealer, the resolver and the edge handler — round trip, tamper, truncation, expiry at the boundary, swapped key id, rotation across two live keys, path traversal and prefix confinement, URL shape and per-call uniqueness, passthrough of requests that are not sealed, idempotency when the handler runs at both hooks, and the provider-seals/edge-opens interop.

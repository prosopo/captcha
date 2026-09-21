---
"@prosopo/provider": minor
---

Hide which dataset image a captcha URL points at, so a solver farm cannot key a label table on the URL.

An image captcha URL used to name its own image: `https://zone.b-cdn.net/v5_dataset_flat/images/abc.webp`. Signed URLs (added earlier) stopped a harvested URL being refetched forever, but they left the path in plain sight — and the path is a perfectly good key for an `image -> label` table. Solve each image once, store the answer against its path, and every future challenge can be answered without looking at a single pixel.

Now the path is sealed into an opaque blob that only a bunny.net edge script can open:

```
https://zone.b-cdn.net/s/AgHk1n...Qx9.webp
```

The blob is AES-256-GCM over the canonical path plus an expiry, authenticated, and drawn fresh every time — so the same image gets a different URL in every session, and the URLs reveal nothing to group them by. The edge script opens it, puts the canonical path back on the request, and the CDN serves the one object that path names: opaque URLs per session, one cached copy, no extra storage.

Sealing happens strictly below `item.data`. The item hash, the captchaId and the datasetId are untouched, so nothing about the dataset or solution verification changes.

**Two ends, two crypto libraries.** The provider seals with `node:crypto` because `AssetsResolver.resolveAsset` is synchronous and every WebCrypto call returns a promise; the edge opens with WebCrypto because that is what its runtime has. The wire format, the validation and the base64url alphabet live in one module both import, and a test seals with one and opens with the other so they cannot drift.

**Deploying it.** Off until `PROSOPO_ASSET_SEAL_KEYS` is set, because a sealed URL is unservable until the matching edge script is live. Order matters:

1. `npm run -w @prosopo/provider build:edge` produces `dist/edge/bunny-asset-seal.js` — one file, the SDK left as an esm.sh import for the bunny runtime to resolve. Deploy it as a middleware script on the image pull zone and set `PROSOPO_ASSET_SEAL_KEYS` on it.
2. Enable **General > Origin > Run script before cache** on that pull zone. With it on, the script runs before the cache lookup, so the cache should be keyed on the rewritten canonical path — worth confirming against the live zone (check the hit ratio, and that two sessions' URLs for one image produce one cache entry) before relying on it, the way the token scheme was. With it off, only `onOriginRequest` fires, on a miss: the rewrite still works and nothing is served unverified, but every session's URLs miss the cache. Correct either way, fast only with it on. This needs edgescript-sdk 0.13 or newer, which is where `onClientRequest` appears.
3. Turn bunny **token authentication off** on that zone. It signs the canonical path, which a sealed URL no longer carries, so the two are alternatives rather than layers.
4. Only then set `PROSOPO_ASSET_SEAL_KEYS` on the provider. It takes precedence over the signed resolver; leave `PROSOPO_ASSET_TOKEN_KEY` in place and the signed path stays as the fallback for any zone not yet migrated.

Configuration, the same names on both sides: `PROSOPO_ASSET_SEAL_KEYS` (`keyId:base64key`, comma-separated, 32 bytes each), `PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID` (which one to seal with, defaults to the highest), `PROSOPO_ASSET_SEAL_TTL_SECONDS` (300), `PROSOPO_ASSET_SEAL_URL_PREFIX` (`s`), and, on the edge only, `PROSOPO_ASSET_SEAL_PATH_PREFIX` to confine what an opened path may point at. Rotation is: publish the new key to both ends, switch the provider's active id, drop the old key once everything sealed under it has expired — more than one key opens at a time, which is what makes that possible without a flag day.

**What it does not do.** A sealed URL still works for anyone who has it until it expires, exactly as a signed one did; binding it to a client is a separate decision with the same cost as `PROSOPO_ASSET_TOKEN_BIND_IP`. And the item hash the widget submits is still the hash of the image bytes, so a farm can switch its table key from the URL to that hash — this closes one of the two, and the other is the obvious next change.

Test coverage: 51 unit tests over the wire format, the sealer, the resolver and the edge handler — round trip, tamper, truncation, expiry at the boundary, swapped key id, key rotation, path traversal and prefix confinement, URL shape and uniqueness, passthrough of non-sealed requests, idempotency when the handler runs at both hooks, and the provider-seals/edge-opens interop.

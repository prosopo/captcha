---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": minor
"@prosopo/procaptcha-frictionless": minor
---

The frictionless response carries a second observation URL, `dns_asset_url`, on the same per-session host as `dns_url`. The widget loads it as an image after sending the existing `dns_url` request.

The DNS sidecar reports the hit like any other. The provider recognises the asset URL's path and records `dnsEvent.assetSeen: true` on the session, leaving the main beacon's `peerIp` and `pathValid` untouched. The sidecar needs no change.

The two beacon requests now go through one function in the widget, instead of the same `fetch` being copied in two places.

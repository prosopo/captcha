---
"@prosopo/types": minor
"@prosopo/provider": minor
---

Routing machines now see which detectors fired, as `raw.triggeredDetectors`.

The provider already stored the triggered detectors on the session but never passed them to the routing machine, so a routing rule could not act on a single detector. They are now passed on the first request, on the post-PoW route and on the dedup replay. On the last two they come from the stored session.

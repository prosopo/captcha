---
"@prosopo/types": patch
"@prosopo/database": patch
"@prosopo/provider": patch
---

Keep a detector bundle binding for as long as its payload is accepted

The `detectorSessionId → bundleId` binding held the only key able to read a
detector payload, and expired after 60 seconds. The frictionless flow accepts a
payload for ten minutes (`DEFAULT_MAX_TIMESTAMP_AGE`). For nine of those ten
minutes the provider would therefore accept a payload it had already discarded
the means to decrypt: `resolveDecryptAttempts` returns an empty key list, the
decrypt loop never runs, the score is forced to 1 and the caller is challenged
despite nothing having been measured about them.

Sixty seconds is ample for the assign → submit gap in the normal case — it is
around 1.5s — but it only has to stall once to be lost, and a backgrounded
mobile tab is enough.

The two values are now one value. `DEFAULT_MAX_TIMESTAMP_AGE` moves from a
private constant in `frictionlessTasks` to `@prosopo/types`, the only package
both the provider and the database can see, and `DETECTOR_BUNDLE_TTL_SECONDS` is
derived from it instead of being written down a second time. A unit test pins
the relationship so they cannot drift apart again.

The TTL cannot now outlive the payload-age check, so this does not widen the
window in which any payload is usable. Bundle selection is unaffected: which
bundle a caller receives is derived from their IP and a server secret, not from
this binding's lifetime.

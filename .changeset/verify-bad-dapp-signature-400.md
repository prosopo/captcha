---
"@prosopo/provider": patch
---

The verify endpoints (image, PoW, puzzle and authenticated session) now answer 400 `GENERAL.INVALID_SIGNATURE` when the `dappSignature` is not hex, is the wrong length, or does not match the site key. Before, the error from the signature check fell into each handler's catch-all and came back as a 500. Anyone could call these endpoints and push up the provider's 500 rate, which made it look unhealthy and skewed the error-rate metrics. Real server faults later in the handlers still return 500.

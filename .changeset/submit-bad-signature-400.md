---
"@prosopo/provider": patch
---

The image, PoW and puzzle solution-submit endpoints now answer 400 `GENERAL.INVALID_SIGNATURE` when the user or provider signature in the body is empty, not hex, the wrong length, or signed by the wrong key. Before, a signature that could not be decoded threw inside the signature check, and a non-matching one raised an error with no status, so both fell into the handlers' catch-all and came back as 500. Anyone could send these and inflate the provider's 500 rate. Genuine server faults after the signature checks still return 500.

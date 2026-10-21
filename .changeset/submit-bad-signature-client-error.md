---
"@prosopo/provider": patch
---

The image, PoW and puzzle solution-submit endpoints now answer 401 `UNAUTHORIZED` when the user or provider signature in the body is empty, not hex, the wrong length, or signed by the wrong key. Before, a signature that could not be decoded threw inside the signature check, and the handlers wrapped every error, including the 401 for a wrong signer, in a 500. Anyone could send these and inflate the provider's 500 rate. Any other client error raised while handling a submission now keeps its own 4xx status too; genuine server faults still return 500 and are still logged.

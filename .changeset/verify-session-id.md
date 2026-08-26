---
"@prosopo/types": minor
"@prosopo/provider": minor
---

Return the verified record's `sessionId` on the verify endpoints.

`VerificationResponse` gains an optional `sessionId`, populated by the image, PoW and puzzle verify paths from the challenge/commitment record they looked up. It lets a caller correlate its own logs with the provider's: the sessionId is carried in neither the procaptcha token nor the verify request body, so the provider is the only party that can supply it. Absent when no record was found, or when the flow carried no session. Not tier-gated, since it is a correlation handle rather than a scoring signal.

---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Thread `shadowDomPenalty: boolean` from the catcher's encrypted detection payload through `decryptPayload` and persist it on `Session.scoreComponents` so the flag is queryable in Mongo without inferring it from `baseScore=1 ∧ ¬triggeredDetectors`. Field is optional on the wire (position 6); older catcher bundles omit it and `shadowDomPenalty` stays undefined.

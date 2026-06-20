---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Add optional `entropyMathRandomFingerprint`, `entropyCryptoFingerprint`, `entropyWallClockOffsetMs` and `entropyMathRandomFirst` fields on `Session` (Zod + Mongoose) and the frictionless `decryptPayload` → `setSessionParams` → `createSession` chain. Sparse compound index `{ siteKey, entropyMathRandomFingerprint, createdAt: -1 }` for query support.

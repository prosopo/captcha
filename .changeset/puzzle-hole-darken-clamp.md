---
"@prosopo/captcha-severity": patch
"@prosopo/provider": patch
---

Keep the real puzzle hole darker than the decoys when `holeDarken` is set at or near 1. The provider now lowers `holeDarken` to `MAX_HOLE_DARKEN` (1 minus the decoy margin) instead of letting both values meet at 1, which made the real hole and the decoys look the same.

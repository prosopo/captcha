---
"@prosopo/datasets": minor
---

`verifyProof` now takes the trusted root to check against: `verifyProof(leaf, proof, root)`.

Before, it only checked that the proof agreed with itself. A proof carries its own root layer, so anyone could build a tree over any leaf they liked and it would pass. The proof must now hash up to the root the caller supplies, and each layer must be a pair. Valid proofs from single-leaf trees, which the old check rejected, now verify.

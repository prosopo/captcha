---
"@prosopo/datasets": patch
"@prosopo/provider": patch
---

Build the proofs returned after a passed image captcha from the right leaves, and refuse to build a proof for a hash that is not a leaf.

The provider asked the commitment tree for a proof of each captcha ID, but the tree's leaves are solution hashes, so no captcha ID is ever a leaf. `proof()` did not check, and returned a proof that linked nothing to the root. The provider now asks for a proof of each leaf, and `proof()` throws `DATASET.MERKLE_ERROR` when the hash is not a leaf. Several merkle tests that could never fail (`expect(x > -1)`) now assert properly.

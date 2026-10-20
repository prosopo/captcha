---
"@prosopo/fingerprint": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
---

Store a compact summary of each verified proof of fingerprint on the PoW record.

Until now the proof was checked and discarded, so nothing it disclosed survived
the request. `summariseFingerprintProof` reduces a proof to its commitment root,
the values it disclosed, and a hash over the subset of those values listed in
`GROUP_KEYS`, and the provider writes that onto the captcha record.

The proof itself is still not stored. Each disclosure carries a full Merkle path,
which is large and spent once verified — at current traffic, retaining proofs
would add roughly 70GB over the collection's one-month TTL against under 3GB for
the summary.

A summary is only produced for a proof that passes structural verification, so
every stored value is one that hashes to the committed root. Bounding what those
values may be is separate and unchanged.

`@prosopo/fingerprint` gains a `./summary` entry point so server-side callers can
import this without the browser-only fingerprinting sources. The new field is
declared on the Mongoose schema: `strict: true` silently drops undeclared paths,
so omitting it would mean writing the field and never storing it.

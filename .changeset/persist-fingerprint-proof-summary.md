---
"@prosopo/fingerprint": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
---

Keep a small summary of each verified proof of fingerprint on the PoW record.

Until now the proof was used and thrown away. It arrives with the solution,
the routing machine checks it, and nothing was stored — a check of three
thousand recent PoW records in production found the field on none of them,
which is correct for how it was wired but leaves nothing behind to count.

Counting is what we want it for. The proof commits to the client's whole
component set and reveals eight values from it, and the account address is
derived from that same set. Two facts follow, and both need the record to
survive the request:

- The commitment root and the account address are functions of one component
  set, so they are one-to-one. A root arriving with a second address, or an
  address with a second root, cannot happen honestly.
- Six of the eight disclosed values are fixed by the installation and the host.
  The other two — colour depth and core count — are the ones an anti-detect
  browser redraws on every launch. A real device reports one pair for its whole
  life, so a single installation cohort carrying several pairs is either several
  machines or one client redrawing an identity its hardware cannot change.

So `summariseFingerprintProof` reduces a proof to the root, the two values that
move, and the six stable ones — both individually and as a precomputed hash of
them. The proof itself still is not stored: each disclosure carries a full Merkle
path, which is large and spent once verified.

Keeping the stable values as well as their hash is what makes a cohort
describable rather than only countable — the hash is one-way, so "which timezone
is this concentrated in?" would otherwise be unanswerable after the fact. The
sizes are the reason the raw proof is not kept: measured against production
traffic of roughly 300,000 submissions a day, storing proofs would add about
70GB over the one-month TTL on a collection that already holds 132 million
records, where the summary adds under 3GB.

The summary is only produced for a proof that passes structural verification.
An unverified disclosure is a client-asserted value with a decorative hash path
beside it, and storing one would put a forgeable field into an aggregation whose
whole value is that it cannot be forged. Bounding what the values may *be* is a
separate job and stays with the routing machine's validator.

`@prosopo/fingerprint` gains a `./summary` entry point so the provider can take
this without pulling in the browser-only fingerprinting sources, and the field
is declared on the Mongoose schema — Mongoose runs `strict: true` and silently
drops undeclared paths, so an omission there would mean writing the field and
never storing it.

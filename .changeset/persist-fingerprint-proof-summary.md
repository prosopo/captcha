---
"@prosopo/fingerprint": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
---

Store a compact summary of each verified proof of fingerprint on the PoW record,
and add a device grouping value to the proof.

Until now the proof was checked and discarded, so nothing it disclosed survived
the request. `summariseFingerprintProof` reduces a proof to its commitment root,
the values it disclosed, and a hash over the subset of those values listed in
`GROUP_KEYS`, and the provider writes that onto the captcha record.

The proof now also discloses `deviceBucket`, a new component from
`@prosopo/fingerprintjs`. It is a 128 bit hash of the device traits that stay the
same between sessions: platform, screen resolution, colour depth, core count and
installed fonts. Disclosing it lets us tell that two visits came from the same
kind of device without being told the platform, the screen size or the font list,
which disclosing those values individually would have done. It is stored as
`bucketId`.

`deviceBucket` is excluded from the visitorId. The account address is a pure
function of the visitorId, so folding a new component in would rotate every
account on record and orphan its sighting history. `forIdentity` drops it before
hashing, and there is a test asserting the visitorId does not move.

The summary reaches the decision machines as well as the database. It is
computed once, at the provider boundary, and handed to both, so the machine and
the stored record cannot disagree about what a proof disclosed, and a 7.8KB
proof is parsed and Merkle-checked once per submission instead of twice. Rules
read it as `input.raw.fingerprintSummary`.

There is also a new counter dimension, `deviceBucket`. One bucket on its own
says nothing, so counting is the whole point: a rule can now ask how much
traffic a kind of device has produced in a window, which no per-request field
can answer. The solve hook writes the counter whenever a proof disclosed a
bucket, and a rule naming the dimension on a request that disclosed none is
skipped rather than read as zero, so an `lte` clause does not match every
client that proved nothing.

The proof itself is still not stored. Each disclosure carries a full Merkle path,
which is large and spent once verified: at current traffic, retaining proofs
would add roughly 70GB over the collection's one-month TTL against under 3GB for
the summary.

A summary is only produced for a proof that passes structural verification, so
every stored value is one that hashes to the committed root. Bounding what those
values may be is separate and unchanged.

`@prosopo/fingerprint` gains a `./summary` entry point so server-side callers can
import this without the browser-only fingerprinting sources. The new field is
declared on the Mongoose schema: `strict: true` silently drops undeclared paths,
so omitting it would mean writing the field and never storing it.

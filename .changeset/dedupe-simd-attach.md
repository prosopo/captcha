---
"@prosopo/provider": patch
---

refactor/provider: dedupe SIMD-readings decrypt+attach boilerplate

The same 20–25-line "decrypt the SIMD readings ciphertext with the
provider detector keys, strip the timestamp, and persist them to the
session record" block was repeated six times across the challenge-GET
endpoints and the submit verifiers. Pulled it into two layered methods
on `CaptchaManager`:

- `decryptSimdReadingsForAttach(ciphertext)` returns the decoded
  readings or `undefined`. Used by the image-submit path which decodes
  once and reuses the result across several session writes.

- `decryptAndAttachSimdReadingsIfAbsent(sessionId, ciphertext, stage)`
  is a thin wrapper for the common decrypt-then-record case used by the
  three challenge-GETs and the PoW/Puzzle submit verifiers.

Net −69 lines across the 6 callsites (+53 of helper). Behaviour is
unchanged.

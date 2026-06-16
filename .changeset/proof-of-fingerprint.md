---
"@prosopo/fingerprint": minor
"@prosopo/types": minor
"@prosopo/api": minor
"@prosopo/procaptcha-pow": minor
"@prosopo/provider": patch
---

feat(fingerprint): proof of fingerprint — Merkle commitment + post-PoW validation hook

Lets a provider require the client to prove it constructed a genuine, well-formed fingerprint, without the validation logic living in the open-source provider.

- `@prosopo/fingerprint`: `getFingerprintProof()` builds a blake2b-256 Merkle commitment over the FingerprintJS component set and produces selective Merkle disclosures (`encodeFingerprintProof`, `verifyFingerprintProofStructure`). Derived from the same component run as `getFingerprint()`. Exposes `FINGERPRINT_DISCLOSURE_KEYS` — disclosing only those keys (rather than every component) keeps the proof ~10x smaller.
- `@prosopo/types`: optional `fingerprintProof` on `SubmitPowCaptchaSolutionBody`, an `ApiParams.fingerprintProof` key, and `fingerprintProof` on `RoutingMachineRawSignals`. Adds an optional `reason` to `RoutingMachineOutput` (+ schema) and a `FrictionlessReason.FINGERPRINT_PROOF_INVALID` value.
- `@prosopo/api`: `ProviderApi.submitPowCaptchaSolution` accepts the encoded proof.
- `@prosopo/procaptcha-pow`: attaches a best-effort proof (disclosing only `FINGERPRINT_DISCLOSURE_KEYS`) to the PoW submission.
- `@prosopo/provider`: threads `fingerprintProof` into the post-PoW routing input (`input.raw.fingerprintProof`); the validation itself runs in the closed-source routing machine. Persists the routing machine's selection `reason` onto the escalated captcha session and logs proof presence + the post-PoW routing decision.

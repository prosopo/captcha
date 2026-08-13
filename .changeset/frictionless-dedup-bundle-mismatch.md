---
"@prosopo/provider": patch
---

Evict the dedup'd session when the incoming request's
`detectorSessionId` resolves to a different pool bundleId than the
cached session's stored bundleId.

`DetectorBundlePool.pickRandom` returns a uniform-random pick per
`/detector/assign`, and the widget always fetches a fresh detector per
page-load. If we hand back a dedup'd session whose bundleId doesn't
match the fresh one, every later `/captcha/{type}` + solution hop
encrypts with the new detector's public key while the provider tries
to decrypt with the cached bundle's private key — yielding
`ERR_OSSL_RSA_OAEP_DECODING_ERROR` on SIMD + behavioural, an empty BDP
from the DM's point of view, and an R1-rule escalation to image on
every submit. Extends the existing "evict on policy/routing conflict"
branch to cover this case. Falls through to reuse when the incoming
detectorSessionId binding cannot be resolved (Redis TTL expired), so
we don't churn every returning user whose page has been open longer
than the binding.

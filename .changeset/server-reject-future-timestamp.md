---
"@prosopo/server": patch
---

Reject captcha tokens whose timestamp is dated in the future when the server-side SDK runs its local freshness pre-check. Previously the check only compared `now - timestamp` against the timeout, so any timestamp ahead of the verifier's clock was treated as recent and passed straight through to the provider. A small clock-skew allowance is kept for honest drift between the issuing provider and the verifier.

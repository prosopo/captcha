---
"@prosopo/util-crypto": patch
---

`jwtVerify` now only accepts tokens whose header says `"alg": "sr25519"`, which is what `sr25519jwtIssue` writes. Before, the header was never checked, so a signed token claiming `none`, `HS256` or anything else was still accepted. The signature is also now checked as a plain sr25519 signature over `header.payload`. Before, it also accepted a signature over the `<Bytes>`-wrapped text (the form a wallet produces when it signs a message) and a 65-byte signature with a crypto-type prefix byte. Tokens issued by `jwtIssue` are unaffected. A signature of the wrong length now returns an invalid result instead of throwing.

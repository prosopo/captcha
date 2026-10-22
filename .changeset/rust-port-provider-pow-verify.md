---
"@prosopo/provider": patch
"@prosopo/cli": patch
"@prosopo/database": patch
---

Port the provider's PoW verify route to Rust: the dapp server's check of a PoW token, with forwarding to the provider that issued it, the site's spam, traffic and IP checks, the score, and the record and session updates. Checked against the real express app on live MongoDB and Redis. Decision machines still need Node, so a site with one cannot be verified by the Rust yet. The TypeScript is unchanged.

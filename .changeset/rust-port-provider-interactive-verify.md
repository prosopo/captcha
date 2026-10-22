---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Port the provider's puzzle, audio and icon-order verify routes to Rust, sharing the PoW verify's checks, each refusal recorded as the TypeScript records it. Checked against the real express app on live MongoDB and Redis. The TypeScript is unchanged.

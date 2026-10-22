---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

The Rust provider can now take image captcha solutions: it checks the signatures and the pending request, grades the answers against the dataset, rejects selections that look scripted, and records the commitment, as the TypeScript does. Tests replay the TypeScript's recorded submissions and compare every answer and stored record, and replay the TypeScript's pair-handling functions over 414 inputs. The TypeScript is unchanged.

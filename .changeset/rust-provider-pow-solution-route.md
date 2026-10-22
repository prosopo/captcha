---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

The Rust provider can now take PoW solutions (`pow/solution`): it checks the signatures and the proof of work, records the result, and escalates to an image or puzzle challenge when the solve has no click position or comes from a different network, as the TypeScript does. A replay test runs the TypeScript's recorded submissions against it and compares every answer and every stored record. The TypeScript is unchanged.

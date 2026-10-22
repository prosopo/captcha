---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/cli": patch
---

The Rust provider can now take puzzle, audio and icon-order solutions, graded and recorded as the TypeScript does, except that a puzzle answer is claimed atomically, as audio and icon-order answers already are, so two simultaneous answers to one puzzle cannot both be graded. A replay test compares every answer and stored record with the TypeScript's. The Rust PoW solution route also stops asking for its session updates to be streamed to the central database, which the TypeScript does not do. The TypeScript is unchanged.

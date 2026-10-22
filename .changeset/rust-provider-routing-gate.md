---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

The Rust provider now checks for routing machines the way it already checks for decision machines, and reads both afresh on every request instead of caching them for five minutes, which is what the TypeScript does. Before this, a machine uploaded through a TypeScript node could go unnoticed by the Rust one for up to five minutes. The TypeScript is unchanged.

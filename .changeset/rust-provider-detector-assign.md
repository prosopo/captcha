---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

The Rust provider can now hand out detector bundles (`detector/assign`), choosing the same bundle for the same caller as the TypeScript does, from the same pool and secret. The TypeScript is unchanged.

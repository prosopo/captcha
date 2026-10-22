---
"@prosopo/provider": patch
"@prosopo/util": patch
"@prosopo/types": patch
---

Start the Rust port of the provider with its IP helpers: the composite IP form stored on records, the IP checks between a challenge and the request that solves it, the IP comparison and its configurable rules, and the session hashes, checked against vectors generated from the TypeScript. Adds JavaScript's `toFixed` rounding to the Rust util crate and the IP comparison types to the Rust types crate. The TypeScript is unchanged.

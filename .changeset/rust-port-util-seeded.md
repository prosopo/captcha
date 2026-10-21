---
"@prosopo/util": patch
---

Add a Rust port of the util package's seeded randomness: the seedrandom generator, `rng(seed)`, and lodash's `random`, `shuffle` and `sampleSize` drawing from a seeded `Math.random`. It gives the same numbers as the TypeScript for the same seed. The TypeScript is unchanged.

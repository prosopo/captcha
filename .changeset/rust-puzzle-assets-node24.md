---
"@prosopo/puzzle-assets": patch
---

Make the Rust port's `Math.pow` match Node 24, the production runtime, which computes it with the system libm rather than the fdlibm port Node 22 used. Puzzle colours and pixels now match what Node 24 renders. The TypeScript package is unchanged.

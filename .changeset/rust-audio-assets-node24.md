---
"@prosopo/audio-assets": patch
---

Make the Rust port's `Math.pow` match Node 24, the production runtime, so the noise level it derives from `10 ** (snrDb / 20)` matches what Node 24 renders. The TypeScript package is unchanged.

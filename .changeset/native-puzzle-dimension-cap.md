---
"@prosopo/native-puzzle": patch
---

`generateBackground` and `generateBackgroundSeparable` now reject a width or height above 4096 with an `InvalidArg` error. Before, a very large size tried to allocate the whole image and could use up memory. At `u32::MAX` it overflowed the size calculation and panicked, and that panic aborted the whole Node process. Any other panic now surfaces as a JS error instead of an abort. Normal puzzle output is byte-for-byte unchanged.

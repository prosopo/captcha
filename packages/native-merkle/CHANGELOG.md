# @prosopo/native-merkle

## 0.0.3
### Patch Changes

- 7faca4d: Add TLS timings into session doc

## 0.0.2
### Patch Changes

- 6db5d8b: Move image-captcha merkle tree computation and per-solution leaf hashing to a Rust napi module (@prosopo/native-merkle). ~4× faster on realistic 9-solution commits. Extends the cli bundle plugin so multiple native-* .node files can coexist without basename collision.

---
"@prosopo/native-merkle": patch
"@prosopo/provider": patch
"@prosopo/datasets": patch
"@prosopo/cli": patch
"@prosopo/config": patch
---

Move image-captcha merkle tree computation and per-solution leaf hashing to a Rust napi module (@prosopo/native-merkle). ~4× faster on realistic 9-solution commits. Extends the cli bundle plugin so multiple native-* .node files can coexist without basename collision.

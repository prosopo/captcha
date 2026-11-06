---
"@prosopo/native-merkle": patch
"@prosopo/native-puzzle": patch
---

CI now runs `cargo fmt --check` and `cargo clippy -D warnings` on the native Rust crates. The existing code is reformatted to pass, and the merkle crate's test-only `build_root` helper is now compiled only for tests. No behaviour change.

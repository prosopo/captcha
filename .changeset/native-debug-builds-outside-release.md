---
"@prosopo/native-ja4": patch
"@prosopo/native-merkle": patch
"@prosopo/native-puzzle": patch
---

The Rust addons now build in debug mode unless `NODE_ENV=production`, so local builds and CI tests stop paying for full link-time optimisation. Production builds (npm publish, the provider image) still run `build:release` with full LTO. Dependencies are optimised even in debug so tests stay fast, and the CI `cargo test` job now runs in debug with a cargo cache instead of a cold release build.

---
"@prosopo/native-ja4": patch
"@prosopo/native-merkle": patch
"@prosopo/native-puzzle": patch
---

The napi crates' cargo test script is renamed test:rust and a lint:rust script (rustfmt check plus clippy) is added, both as turbo tasks, so Rust checks run through turbo like the rest. native-merkle and native-puzzle are reformatted with rustfmt, which they had drifted from.

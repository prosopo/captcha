---
---

CI now runs the Rust unit tests (`cargo test --release --locked`) for native-ja4, native-merkle and native-puzzle on every pull request. Before, nothing ran them, so a broken Rust test could merge unnoticed.

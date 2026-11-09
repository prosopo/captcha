---
---

Stop `check` failing for good when a matrix job is cancelled before it expands. A cancelled `security-scan` run left a check run called plain `cargo audit`, while its replacement reported `cargo audit (packages/native-ja4)` and the other matrix names. `check` paired runs by name only, so the cancelled one never matched anything and counted as a failure on every re-run. `check` now drops a cancelled check run when a later run of the same workflow exists on the same commit, and waits for that later run to finish.

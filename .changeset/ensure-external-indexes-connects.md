---
"@prosopo/cli": patch
---

`ensure_external_indexes` now connects to the central database before ensuring its indexes, and closes the connection afterwards. Before, it never connected, so it skipped every collection and still reported success.

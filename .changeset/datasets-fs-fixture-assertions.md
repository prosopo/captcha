---
"@prosopo/datasets-fs": patch
---

The dataset command tests now actually check their output. Before, the image comparisons for flatten and resize were computed and thrown away, which hid that the checked-in fixtures were out of date (they still used the old 512-bit image names). The fixtures are regenerated with the current commands, the comparisons are real assertions, and the tests write into a temporary directory instead of rewriting the checked-in fixture files while they run.

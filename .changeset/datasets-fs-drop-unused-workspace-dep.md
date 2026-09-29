---
"@prosopo/datasets-fs": patch
---

Remove the unused `@prosopo/workspace` dependency from datasets-fs. The tests stopped importing it in the fixture-assertions change, and the leftover dependency made the lint check fail on every PR.

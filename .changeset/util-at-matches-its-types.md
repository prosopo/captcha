---
"@prosopo/util": patch
---

`at()` now does what its type signature already promised. Without `optional: true` it throws when the element it finds is `undefined` (its return type already excluded `undefined`, so callers were never checking), and it throws on a non-integer index instead of quietly returning `undefined`. The comment now describes the default wrap-around behaviour correctly.

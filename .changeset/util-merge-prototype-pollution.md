---
"@prosopo/util": patch
---

`merge` no longer lets a source object write to `Object.prototype`. A source parsed from JSON with a `__proto__` or `constructor.prototype` key used to be merged into the shared prototype of every object; those keys are now skipped or copied as plain own properties, and merging only descends into values the destination owns.

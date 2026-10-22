---
"@prosopo/types-database": patch
---

The Rust mongoose engine now runs update validators (`runValidators`) on an update's set, set-on-insert and unset paths, honours a schema's `minimize: false`, and casts `$addToSet` and `$push` on arrays as mongoose does: each value in `$each` as an element, with the other modifiers kept. The TypeScript is unchanged.

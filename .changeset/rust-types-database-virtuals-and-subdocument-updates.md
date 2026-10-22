---
"@prosopo/types-database": patch
---

The Rust mongoose engine now adds the `id` virtual where a schema's `toObject` option asks for it, hoists a subdocument's indexes onto the parent as mongoose does, casts `$push` of a subdocument and `$pull` from a document array, and puts a filter's `$and` and `$or` first as mongoose's query merge does. The TypeScript is unchanged.

---
"@prosopo/types-database": patch
---

The check that each Rust schema is declared as mongoose declares it is now shared: the mongoose side is `rust/equivalence/describe.ts` and the Rust side the public `schema_description` module, so other packages' generators can prove their schemas the same way. The recorded vectors are unchanged. The TypeScript is unchanged.

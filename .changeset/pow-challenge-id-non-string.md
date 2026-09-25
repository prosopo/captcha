---
"@prosopo/types": patch
---

A PoW challenge that is not a string (missing, null, an array or an object) now fails validation instead of throwing a TypeError from inside the schema, so `safeParse` on any request body that carries a challenge returns an error rather than crashing. Adds a test that feeds every provider API schema field empty and wrongly typed values and checks none of them throw.

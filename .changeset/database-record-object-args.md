---
"@prosopo/types-database": patch
"@prosopo/database": patch
"@prosopo/provider": patch
---

The database methods that store and update captcha records (PoW, puzzle, audio, icon order, pending image commitments) now take one named-field object instead of long positional parameter lists. Stored data is unchanged.

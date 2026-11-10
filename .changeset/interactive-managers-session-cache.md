---
"@prosopo/provider": patch
---

Puzzle, audio and icon-order requests now update and invalidate the cached session the same way PoW and image requests do, so the cache no longer disagrees with the database after these challenges are issued or solved.

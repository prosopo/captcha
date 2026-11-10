---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Puzzle records now store where the piece was dropped (`finalX`, `finalY`) and its distance from the target, so a rejected solve shows how far off it was.

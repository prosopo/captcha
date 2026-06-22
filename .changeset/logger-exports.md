---
"@prosopo/logger": major
"@prosopo/api-express-router": patch
---

Tighten @prosopo/logger public exports: drop the stringifyBigInts re-export (import it from @prosopo/util instead) and stop exporting internal-only symbols (level/format string constants and LevelMap).

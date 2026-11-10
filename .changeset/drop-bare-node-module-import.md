---
"@prosopo/config": patch
---

Library ESM builds no longer emit a bare `import "node:module"` from Rolldown's runtime chunk. The import was left behind once its unused `createRequire` helper was removed, and because library builds run with tree-shaking off it stayed in every entry, so browser bundlers such as esbuild could not bundle packages like `@prosopo/util`.

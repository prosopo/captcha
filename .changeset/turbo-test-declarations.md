---
"@prosopo/config": patch
---

Build workspace declarations before running tests. `turbo run test` depended only on `@prosopo/config#build`, so a package's dependencies were present in `dist` as bundled JavaScript with no `.d.ts`. Type checking then fell back to the compiled JS, which reports types as values and floods the run with implicit-any errors from other packages' output.

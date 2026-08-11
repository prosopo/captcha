---
"@prosopo/config": patch
---

Turn on whitespace minification for production frontend bundles.

`build.minify: true` was not producing a fully minified bundle. Vite maps it to
oxc, and for a `lib` build in `es` format it hands rolldown
`{ compress: true, mangle: true, codegen: false }` — so the shipped output was
compressed and mangled but still fully indented, one statement per line.

Every frontend bundle in this repo is a `lib` + `formats: ["es"]` build, so all
of them hit that branch. Setting `output.minify` explicitly overrides it, since
the resolved output options spread `...output` last.

Measured on `@prosopo/procaptcha-bundle`, production mode:

| | before | after |
| --- | --- | --- |
| critical path, raw | 658,004 | 510,119 (−22.5%) |
| critical path, gzip | 199,625 | 180,385 (−9.6%) |
| all chunks, raw | 1,247,449 | 1,018,266 (−18.4%) |
| all chunks, gzip | 474,695 | 442,954 (−6.7%) |

The raw reduction is the point: that is parse and compile work on every page
load, and it lands hardest on low-end mobile. Chunk membership is unchanged.

Only applied when building for production, so dev builds stay debuggable.

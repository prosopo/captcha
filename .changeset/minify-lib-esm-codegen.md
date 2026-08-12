---
"@prosopo/config": patch
---

Enable whitespace minification for production frontend bundles.

For a `lib` + `es` build, Vite downgrades `build.minify: true` to
`{ compress: true, mangle: true, codegen: false }`, so bundles shipped compressed
and mangled but still pretty-printed. Setting `output.minify` explicitly fixes it.

On `@prosopo/procaptcha-bundle`, the critical path drops 22.5% raw (658KB → 510KB)
and 9.6% gzipped. Chunk membership is unchanged. Production builds only.

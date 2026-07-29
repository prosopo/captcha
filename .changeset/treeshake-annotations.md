---
"@prosopo/config": patch
---

Honour /*#__PURE__*/ annotations when tree-shaking. Rolldown has no
`treeshake.preset`, so Rollup's "smallest" could not be carried across in the
Vite 8 upgrade; ignoring pure annotations retained dead library code that every
consumer shipped. Cuts ~17KB gzip off the procaptcha widget bundle with a
byte-identical detector bundle.

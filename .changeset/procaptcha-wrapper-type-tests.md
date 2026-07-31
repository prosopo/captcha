---
"@prosopo/procaptcha-wrapper": patch
---

fix(procaptcha-wrapper): export ProcaptchaLanguages as a usable type

Writing type tests for this package's public surface exposed a real defect.
`Languages` in `@prosopo/locale` is a const object, so it carries no type
meaning of its own — re-exporting the name as `ProcaptchaLanguages` gave
consumers a binding they could not actually use in a type position. It is now
the union of the object's values, which is exactly what
`ProcaptchaRenderOptions["language"]` already accepts, and a type test keeps
the two aligned.

The accompanying type tests pin the rest of the published contract: the
`RendererFunction` signature (`HTMLElement`, not a bare `Element` — the render
script reaches for properties only `HTMLElement` has), the optional loader
override on `createRenderer` that makes the renderer testable without a
network, and `window.procaptcha` being declared possibly-absent so consumers
are forced to narrow before reaching for `render`.

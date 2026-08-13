---
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-bundle": minor
"@prosopo/procaptcha-puzzle": minor
"@prosopo/procaptcha-react": minor
"@prosopo/procaptcha-pow": minor
"@prosopo/locale": minor
---

Replace React with vanilla TS/DOM in the widget.

The widget packages no longer depend on react, react-dom, @emotion or
react-i18next: every component is now a `mount*` function returning a handle
with `update`/`destroy`. `useTranslation` is replaced by `createTranslator`,
which exposes i18next's `t` plus the events that used to trigger a re-render.
The rendered markup, styling and behaviour are unchanged — only the
implementation is.

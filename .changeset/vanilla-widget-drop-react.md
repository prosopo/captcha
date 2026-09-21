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

Everything the widget has gained since this rewrite started is carried over,
so nothing is lost by dropping React: the shared challenge surface (popup and
float placement, escape/outside-click dismissal and the dialog focus trap),
the image-tile and puzzle-piece keyboard paths, the checkbox's focus handover
across the loading swap, the server-rendered puzzle imagery, `startMode:
"manual"` with `window.procaptcha.start()`, `data-bind` / targeted
`execute(widgetId)`, the Web Bot Auth "authenticated" badge, the client
session id, and the bounded session re-mint and reload handling in the
frictionless wrapper.

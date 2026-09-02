---
"@prosopo/types": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-bundle": minor
"@prosopo/client-bundle-example": patch
---

Sites can now control when the widget starts working.

By default the widget runs bot detection, starts the behavioural collectors and calls `/frictionless` as soon as it mounts. Rendering with `data-start-mode="manual"` (or `startMode: "manual"` in the render options) keeps all of that off the page load: the checkbox still appears immediately, at its final size, so nothing shifts, but the widget does nothing else until one of two things happens.

- The site calls `window.procaptcha.start()`, optionally with a widget id, or dispatches a `procaptcha:start` event on `document`. The frictionless flow runs and the widget then waits for a click exactly as it does today.
- The visitor clicks the checkbox. The frictionless flow runs and whichever challenge the provider chooses opens straight away, carrying that click's position, so the visitor is never asked to click twice.

Both triggers are one-shot: whichever comes first wins and the other is ignored. `window.procaptcha.execute()` also starts a manual widget, opening its challenge immediately. Widgets in the default `auto` mode are unaffected.

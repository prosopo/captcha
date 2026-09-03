---
"@prosopo/types": minor
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-react": minor
"@prosopo/procaptcha-puzzle": minor
"@prosopo/procaptcha-pow": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/procaptcha-bundle": minor
"@prosopo/procaptcha-wrapper": minor
---

Let a site choose where a challenge opens, and which button triggers it.

- `placement: "popup" | "float"`, also `data-placement`. `popup` is the default and unchanged. `float` anchors the challenge to the widget, keeps the page usable behind it, flips above the widget when there is no room below, and dismisses on Escape or an outside click. An invisible widget always uses popup.
- `bind: "#selector"`, also `data-bind`. The matching host-page button triggers that one widget, in visible or invisible mode. The click's default action is prevented so a submit button does not post the form before a token exists.
- `execute(widgetId?)`. Called with no argument every widget responds, as before. Called with the id `render()` returns, only that widget runs. Implicitly rendered invisible buttons now trigger only their own widget.

Behaviour changes for existing widgets:

- Escape now closes the image and puzzle challenge in both placements. For the image captcha this runs the cancel path, which fires `onClose` and restarts frictionless.
- The puzzle challenge is now portalled to `document.body`, as the image modal already was, so a host page's `overflow: hidden` cannot clip it. CSS or selectors scoped under the widget no longer match it. The image modal keeps its `prosopo-modalOuter` class.

Image and puzzle now share one `ChallengeSurface`. `createConfig` takes a named options object.

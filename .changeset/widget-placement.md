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
- Image and puzzle now present on one shared `ChallengeSurface`. Both were already portalled to `document.body`, so neither moves in the page, but the markup around them changed: the outer layer keeps `prosopo-modalOuter` for the image captcha and also carries `prosopo-challenge-surface`, and a new `prosopo-challenge-content` element sits between it and `prosopo-modalInner`. A direct-child selector such as `.prosopo-modalOuter > .prosopo-modalInner` no longer matches, and the centring transform now lives on `prosopo-challenge-content` rather than on `prosopo-modalInner`.

`createConfig` takes a named options object.

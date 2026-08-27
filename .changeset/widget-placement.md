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

Two new render options, both also readable as data attributes for implicitly-rendered widgets:

- `placement: "popup" | "float"`. `popup` is the default and is exactly what every challenge did before — centred over the page. `float` anchors the challenge to the widget, leaves the page usable behind it, flips above the widget when there is no room below, and dismisses on Escape or a click outside. An invisible widget has no on-page anchor, so a float request from one resolves back to popup.
- `bind: "#selector"`. Binds a host-page button to one widget, so the widget can sit in one place and be triggered by a form's own submit control. Rendering into a `<button>` still works and needs no selector.

`execute()` now takes an optional widget id. Called with no argument it behaves as before and every widget on the page responds; called with an id — the one `render()` returns — it dispatches a non-bubbling event on that widget alone, which is what lets two bound buttons drive two widgets independently.

Underneath, image and puzzle each had their own full-viewport overlay with its own scrim, z-index and centring. Both now present on one `ChallengeSurface`, so a placement is implemented once instead of per challenge type. The puzzle gains the portal-to-body the image modal already had, which stops a host page's `overflow: hidden` — or any ancestor with a transform, which re-roots `position: fixed` — from clipping the challenge. The image modal keeps emitting `prosopo-modalOuter` so existing customer stylesheets still match.

`createConfig` takes a named options object; it had reached eight positional parameters.

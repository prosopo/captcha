---
"@prosopo/procaptcha-puzzle": patch
---

Portal the puzzle overlay onto the body so it cannot be trapped inside the widget.

`PuzzleCanvas` renders a full-viewport scrim with `position: fixed; inset: 0`,
but rendered it where the widget sits and relied on nothing above it
establishing a containing block. The widget skeleton does exactly that:
`.prosopo-widget__wrapper` carries `container-type: size`, because it is the
query container the checkbox sizes itself against, and a size container applies
layout containment — which makes it the containing block for fixed-position
descendants.

Where that containment is applied, `inset: 0` resolves against the 302x80
widget box instead of the viewport, and `.prosopo-widget__inner`'s
`overflow: hidden` then clips what is left. The puzzle renders as an unusable
sliver inside the host page rather than over it, and cannot be completed.
Reported on an iPad running iOS 17.7; recent WebKit does not apply the
containment here, which is why it did not show up on desktop.

The overlay now goes through `createPortal` to `document.body`, so no ancestor
can capture it — the same escape the image captcha's `Modal` already used.
Moving out of the widget's subtree means host-page styles now reach the
overlay, which is acceptable for the same reason it is on the image modal:
every element in the canvas is styled inline.

`react-dom` moves from a dev dependency to a runtime one, matching
`@prosopo/procaptcha-react`.

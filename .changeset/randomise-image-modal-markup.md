---
"@prosopo/procaptcha-react": minor
"@prosopo/procaptcha-common": minor
---

Give the image challenge dialog different class names, a different DOM shape, different element types for its controls and slightly different spacing on every page load, so a solver script cannot hardcode a way to find or click anything inside it.

This is the same treatment the checkbox got. Until now the dialog was identical for every user, forever: the panel was always `.prosopo-modalInner` inside `.prosopo-modalOuter` inside `.prosopo-challenge-content`, every tile and every action was a `<button>`, the grid gap was always 10px, and the whole thing sat at the same offsets. The end-to-end suite was itself finding the images by climbing four parents and stepping sideways from the instruction line — which is the clearest possible evidence that the markup was a reliable handle.

Four things now change, all drawn fresh each time a challenge mounts:

- **The names.** Every class the dialog renders — the two modal layers, the challenge surface and its panel, the reload control — is an 8-character token drawn at mount. Selectors scraped from one page load are dead on the next. The challenge surface is shared with the puzzle, so the puzzle gets this too. Nothing in the widget's own CSS referenced these names, but a site that had written its own rules against `.prosopo-modalOuter`, `.prosopo-modalInner`, `.prosopo-challenge-content` or `.reload-button` will find they no longer match. `image-captcha` on the widget root stays fixed, as `prosopo-checkbox` did, because that one sits in the embedding page's light DOM.
- **The shape.** The panel, the header, the grid, the action row, each action and each tile sit inside a random number of randomly named `div` or `span` wrappers. The wrappers are `display: contents`, so they generate no boxes and cannot move anything: depth varies, layout does not. Only elements with no accessible role are used, so nothing new is announced to a screen reader.
- **The element each control is made of.** Every tile and every action is now randomly either a real `<button>` or a `<div role="button" tabindex="0">`, so `button` no longer finds them all. The generic variant is given by hand what the button gave for free: it is in the tab order, it activates on Enter and on Space, Space does not scroll the dialog, and it carries the same `aria-pressed` state. The surface's focus trap already matched `[tabindex]:not([tabindex="-1"])`, so both variants are trapped and tabbable alike.
- **The spacing.** The grid gap, the grid's and the header's padding, the action row's padding and the panel's own margins are each nudged a few pixels, so tile centres are not where they were last time. Each of these changes the panel's size rather than moving the panel, so the surface still centres it and a panel taller than the viewport still scrolls to its own edges. The tile and action widths are now derived from the gap they were drawn with — three columns fit only if each cell gives up two thirds of a gap, and the old hardcoded basis would have wrapped the row at the wide end of the range.

Three related fixes come with it:

- The tick badge on a selected tile was shipping `data-testid="CheckIcon"` to production, plus an `aria-label` on an `aria-hidden` element that nothing could ever read and a stray `color="#fff"` attribute. All three are gone.
- The reload button acted on any click, including one a script dispatched. It now takes the same trusted-event gate every other control in the widget has.
- The end-to-end suite no longer depends on the markup at all. It uses `data-cy` hooks — the instruction line, the challenge panel, the round, the reload control — that are withheld from production builds, exactly as the checkbox withholds `captcha-checkbox`.

Note what this does not do. The dialog still says it is a dialog, the tiles still expose the button role and their pressed state, and the images still carry alt text. A script that looks for what these things mean rather than what they are called will still find them. That is the price of the challenge being usable with a screen reader, and it is the right price; the point here is to kill the cheap selector, not to claim the dialog is unfindable.

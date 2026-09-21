---
"@prosopo/widget-skeleton": minor
"@prosopo/procaptcha-common": minor
---

Give the checkbox a different set of class names and a different DOM shape on every page load, so a solver script cannot hardcode a way to find it.

Until now the widget rendered the same markup for every user, forever. The control was always `input.prosopo-checkbox__box`, the label was always `.prosopo-checkbox__label`, and the box always sat inside the same four nested divs at the same pixel offset. Anyone writing a script to click it only had to work that out once. The element `id` was already randomised per render, which bought nothing while everything around it stayed fixed.

Two things change, both generated fresh each time a widget mounts:

- **The names.** Every class inside the checkbox's shadow root is now an 8-character token drawn at mount, in both the loading skeleton and the live control. Selectors scraped from one page load are dead on the next.
- **The shape.** The fixed four-div nest is now between two and five wrappers, each randomly a `div` or a `span`, so structural and `nth-child` selectors do not hold either. Only elements with no accessible role are used, so no landmark is introduced for a screen reader.

Two related fixes come with it:

- `procaptcha-common`'s checkbox set `data-cy="captcha-checkbox"` on the real input unconditionally, shipping an end-to-end test hook to production. The widget skeleton has always withheld that attribute outside development; the component now does the same.
- Finding the checkbox's interactive area was itself done by class lookup across two shadow boundaries. `createCheckboxElement` and `createWidgetSkeletonElement` now return the node directly, which is what allows the names to change at all, and removes a lookup that could silently return `null`.

The spinner rules that `procaptcha-common` renders used to live in `widget-skeleton`'s stylesheet — an undeclared dependency that only worked because the component happened to render inside that shadow root. Each package now carries its own, so the two can name things independently.

Breaking for direct API consumers: `WIDGET_CHECKBOX_SPINNER_CSS_CLASS` is gone, since no such class exists any more, and `createWidgetSkeletonElement` returns `{ element, interactiveArea }` rather than a bare element. `createWidgetSkeleton` — what the bundle actually calls — is unchanged.

The one class still fixed is `prosopo-checkbox` on the host element, which sits in the embedding page's light DOM where a site's own CSS may target it. Note also what this does not do: the control is still a real `<input type="checkbox">` in an open shadow root, so a script that looks for it by role or type rather than by name will still find it. Closing the shadow root, or making the real input harder to tell from decoys, is a separate decision with accessibility and testability costs to weigh.

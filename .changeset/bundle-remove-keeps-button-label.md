---
"@prosopo/procaptcha-bundle": patch
---

`procaptcha.remove()` on an invisible-mode widget cleared the whole host element. That element is usually the site's own submit button, so the button lost its label. In invisible mode, `remove()` now removes only the node the widget added. `reset()` also removes that node before it rebuilds, so the button no longer collects an extra widget node on every reset.

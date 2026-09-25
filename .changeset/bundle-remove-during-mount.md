---
"@prosopo/procaptcha-bundle": patch
---

`procaptcha.remove()` now wins over a widget that is still loading. Previously, calling `remove()` while a `render()`, `reset()` or the page's automatic render was still loading its code let that widget appear afterwards anyway, back in the page and reachable by `execute()`. A widget that lands after its removal is now torn down instead.

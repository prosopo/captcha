---
"@prosopo/procaptcha-bundle": patch
---

Make `reset()` remount the widget instead of only tearing it down.

`reset()` unmounted every React root and then called `start()`, which
re-renders only when the page uses implicit rendering. On an explicitly
rendered page nothing came back: the widget skeleton is plain DOM created
outside React, so it stayed on screen with no checkbox inside it, and no fresh
captcha request was ever made. Callers had to follow every `reset()` with their
own `render()` to recover.

Widgets are now tracked with the element and render options that produced them,
so `reset()` can rebuild in place. `render()` returns a widget id, and both
`reset(widgetId)` and the new `remove(widgetId)` accept one to target a single
widget; omitting it applies to every widget on the page. `remove()` preserves
the old teardown-without-remount behaviour for callers that want the widget
gone. `reset()` no longer calls `start()`, which would have double-rendered
implicit widgets and attached another `load` listener on every call.

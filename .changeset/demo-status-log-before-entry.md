---
"@prosopo/client-bundle-example": patch
---

Make the explicit-render demo pages show a widget again. The status-log helper was defined in a module script that Vite placed after the page's own entry module, so `window.updateCaptchaStatus(...)` threw at the top of frictionless-, image-, puzzle- and puzzle-bind-explicit before `render()` was called. The helper is now defined by a classic script at the start of `<head>`, and only the callback wrapping stays in a module after the entry.

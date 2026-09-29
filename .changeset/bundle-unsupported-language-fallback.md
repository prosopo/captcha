---
"@prosopo/procaptcha-bundle": patch
---

`render(el, { language })` with a language Procaptcha doesn't support, such as `"he"`, now falls back to English. Before, the value failed config validation, `render()` rejected, and the widget's loading spinner never went away.

---
"@prosopo/client-bundle-example": patch
---

Restore the `frictionless-implicit.html` demo page.

The playground redesign renamed it to `image-implicit.html` and switched it to
an image site key, which left nothing serving that path. Suites outside this
repo navigate to it directly and were being answered by the dev server's
fallback to the index page — which happens to render a frictionless widget, so
they passed by luck rather than because the page they asked for existed.

---
"@prosopo/types": patch
"@prosopo/api-express-router": patch
---

The provider's request logs now include `bundleVersion` and `bundleOrigin`, the widget's `x-prosopo-bundle-version` and `x-prosopo-bundle-origin` headers, next to `integration`. Values that don't look like a release number (or `dev`), or an http(s) origin, are left out.

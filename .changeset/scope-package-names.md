---
---

Add a `package-scope` PR check that fails when any tracked package.json names a package outside the `@prosopo/` scope, since an unscoped name could be registered by someone else on npm. Every package here is already scoped.

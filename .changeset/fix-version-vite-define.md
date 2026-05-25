---
"@prosopo/util": patch
---

Restore Vite build-time substitution of the package version.

The `process` guard added in #2551 introduced optional chaining
(`process.env?.PROSOPO_PACKAGE_VERSION`), which Vite's `define` plugin
no longer matches because the AST node becomes an OptionalMemberExpression
instead of a plain MemberExpression. As a result the build-time version
was never inlined and bundled servers reported `version: "dev"` from the
`/v1/prosopo/provider/public/details` endpoint.

Drop the `?.` while keeping the `typeof process !== "undefined"` guard
so the guard still protects browser runtimes and Vite's define
substitution works again.

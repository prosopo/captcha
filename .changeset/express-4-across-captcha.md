---
"@prosopo/provider": patch
"@prosopo/cli": patch
"@prosopo/api-express-router": patch
---

Finish holding express at 4, and build `@prosopo/fingerprint` before the
provider that imports it.

v3.8.37 pinned `@prosopo/locale` back to express 4 because the i18next
middleware has no express 5 typings, but left `provider`, `cli`,
`api-express-router` and the two demos on express 5. That split the workspace:
`provider` takes the middleware handler from `locale`, which is now typed for
express 4, and hands it to its own express 5 `app.use`, which does not accept
it. All six are on express 4 now.

Separately, `packages/provider` gained a dependency on `@prosopo/fingerprint`
without a matching tsconfig project reference, so `tsc --build` did not build
it first. A full build hid this because something else built fingerprint
earlier; a partial build of just the packages a consumer needs did not, and
failed with "Cannot find module '@prosopo/fingerprint/summary'". The reference
is now declared.

Lift the express pins together with the dependabot ignore once the middleware
ships express 5 typings.

---
"@prosopo/cli": patch
---

Make the provider bundle runnable from a checkout again.

`sharp` is a native module, so it is deliberately left out of the bundle and
installed next to it instead. Under npm it also ended up in the repo's top
level `node_modules`, so running the bundle from a checkout found it there.
pnpm puts a package only where something asked for it, and only
`@prosopo/puzzle-assets` asks for `sharp`, so running the bundle failed with
"Cannot find package 'sharp'" — which is what broke the bundle test. pnpm is
now told to put `sharp` at the top level too. Nothing about what goes into
the bundle, or about the provider image, changes.

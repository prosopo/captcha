---
"@prosopo/procaptcha-bundle": patch
---

Let the webpack bundle resolve modules the way node does.

`webpack.config.cjs` had two assumptions that only hold when this repo is the workspace root:

- the `@polkadot/x-textdecoder` and `@polkadot/x-textencoder` aliases were built from a hard-coded `../../node_modules`, and
- `resolve.modules` was set to every `node_modules` directory found under the repo, to work around the shared config pinning it to this package's own `node_modules` (which switches off the upward walk entirely).

Checked out as a submodule of captcha-private the hoisted install sits a level higher again, so the aliases pointed at a directory that does not exist and the build failed with 19 unresolved `@polkadot/util` imports. Listing every `node_modules` also made each nested install a global resolution root, so a transitive copy such as `@noble/curves`' own `@noble/hashes` could satisfy a bare `@noble/hashes/sha256` and then fail on its exports map.

The aliases are now found by walking up for whichever `node_modules` actually contains them, and `resolve.modules` is webpack's default upward walk. The aliases stay because `@polkadot/extension-dapp`'s nested copy of `@polkadot/util` really is installed without them.

No behaviour change in the emitted bundle; it is the same webpack build, resolving against the same packages. Covered by `bundle:webpack`, which is run in this repo's tests workflow and (now passing) in captcha-private's cache workflow.

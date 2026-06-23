---
"@prosopo/util-crypto": patch
---

ci: add pinned-versions supply-chain workflow and pin existing dependency ranges to their already-resolved exact versions.

The installed tree is unchanged (package-lock.json already resolved to these versions), but pinning a published package's runtime dependency narrows the range its consumers resolve. `@prosopo/util-crypto` is the only published library whose `dependencies` changed (`@scure/base` -> exact), so it gets a patch bump. Other pins are dev-only or in demo apps that nothing depends on, so they need no release.

---
---

Releases are tagged per package on every push to main (`<name>-v<version>`) and published from the `cli-v<version>` tag in the same workflow, instead of a single root `v<version>` tag cut from a "Release v" PR title. The root package.json no longer carries a version.

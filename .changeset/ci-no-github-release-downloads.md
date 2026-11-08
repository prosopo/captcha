---
"@prosopo/cli": patch
---

Stop CI depending on GitHub release downloads, which returned 504 for hours on 8 Nov and failed every PR. The actionlint check is removed. gitleaks and hadolint are now copied out of their official Docker Hub images, pinned by digest, instead of downloaded from GitHub releases.

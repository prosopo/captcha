---
---

CI only, no package bump.

Every workflow now starts from a read-only `GITHUB_TOKEN`. A workflow with no `permissions:` block now declares `contents: read`, and a top-level write grant has moved onto the jobs that use it, so jobs that only read no longer get write access.

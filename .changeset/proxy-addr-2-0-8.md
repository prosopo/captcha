---
---

Bump `proxy-addr` to 2.0.8 in the lockfile, which fixes the critical IP-spoofing advisory GHSA-jqcg-44mw-7w3h that was failing `pnpm audit`. Express's own version range already allows it, so no package changes.

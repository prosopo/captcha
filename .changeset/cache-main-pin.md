---
---

Point cache-main at the shared workflow version that accepts `node-version-file`. Since #3752 passed that input to an older pin, every cache-main run failed to start and main's dependency cache stopped refreshing.

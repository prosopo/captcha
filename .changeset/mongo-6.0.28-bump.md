---
---

chore: bump mongo 6.0.17 → 6.0.28 in compose + integration tests (tag yanked from Docker Hub). Adds 120s timeout to `beforeAll` hooks that pull mongo via testcontainers so the first fresh pull doesn't time out at the default 10s.

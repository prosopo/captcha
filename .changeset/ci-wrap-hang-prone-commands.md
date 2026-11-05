---
---

Wrap hang-prone CI commands (pnpm, cargo, docker, gh, ...) in `timeout` so a hung command fails with its name instead of running out the step. Bumps the shared check-timeouts action, which now enforces this.

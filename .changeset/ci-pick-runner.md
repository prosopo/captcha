---
---

ci: take every job's runner from the shared pick-runner workflow

Each workflow now starts with a `runner` job that calls prosopo/github_actions
`pick-runner.yml`, and its jobs read `runs-on` from it instead of a hardcoded
`ubuntu-latest`. This repo has no `GH_RUNNER_MAP`, so everything still runs
hosted, and fork PRs are hosted whatever is asked. The iOS job keeps `macos-15`.

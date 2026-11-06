---
---

ci: lint every Dockerfile with hadolint and build the caddy and vector images on pull requests

A new `docker` workflow runs on PRs that touch a Dockerfile. It lints all five tracked Dockerfiles with hadolint (rules in `.hadolint.yaml`) and fails if a new Dockerfile is added without being listed. The caddy and vector images are built, never pushed, when their Dockerfile changes. Two lint fixes: caddy writes robots.txt with `printf` instead of `echo -e`, which plain `sh` does not define, and vector writes Docker's apt source with a redirect instead of `| tee`, so a failing `echo` can no longer be hidden by the pipe.

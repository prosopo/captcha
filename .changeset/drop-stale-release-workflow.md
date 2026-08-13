---
---

chore(ci): drop release.yml, which has had no runs in 2026

`release.yml` last executed on 2025-11-13 (167 lifetime runs). Its `push:`
trigger has been commented out for some time, leaving it `workflow_dispatch`
only, and the release path it served is now covered by `create_release_pr.yml`,
`tag_release.yml` and the tag-triggered `publish_release.yml` — all of which
run regularly.

No other workflow or script dispatches it.

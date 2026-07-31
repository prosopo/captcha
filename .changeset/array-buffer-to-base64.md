---
"@prosopo/util": patch
---

feat(util): add arrayBufferToBase64

Protect's telemetry bundle imports this helper from `@prosopo/util` when built
in encrypted mode. It only ever existed in the published `3.3.3` tarball, never
on `main`, so building the bundle against the workspace copy failed with
`"arrayBufferToBase64" is not exported`.

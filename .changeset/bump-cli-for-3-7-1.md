---
"@prosopo/cli": patch
---

Bump `@prosopo/cli` so the next release cuts 3.7.1.

`create_release_pr` derives the repo version from this package:

```bash
root_version=$(npm -w @prosopo/cli pkg get version | jq -r '.["@prosopo/cli"]')
npm pkg set version="$root_version"
```

The changesets pending after v3.7.0 target `@prosopo/procaptcha-bundle`, `@prosopo/procaptcha-frictionless` and `@prosopo/client-bundle-example`. `@prosopo/cli` depends on none of them, so `changeset version` left it at 3.7.0 and the release re-cut 3.7.0 rather than 3.7.1.

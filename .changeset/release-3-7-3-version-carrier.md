---
"@prosopo/cli": patch
---

Bump `@prosopo/cli` so the frictionless detector-logging fix can ship as a release.

There is no cli change here. This exists purely to move the release number, and
the reason is structural rather than incidental.

`create_release_pr` sets the root and `docker/images/provider` versions to
whatever `@prosopo/cli` is after `changeset version`. The only pending changeset
bumps `@prosopo/procaptcha-frictionless` (2.13.2 → 2.13.3) and
`@prosopo/procaptcha-bundle` (4.1.46 → 4.1.47). Neither is in cli's dependency
tree — cli depends on `@prosopo/provider`, `api`, `types` and friends, which is
why ordinary releases bump it by cascade and this one does not. So
`changeset version` leaves cli, and therefore the root, at 3.7.2, the release PR
comes out titled "Release v3.7.2" again, and no new tag is cut.

That matters beyond a cosmetic version number, because captcha-private's own
`create_release_pr` derives its version from this repo's latest `v*.*.*` tag and
then **checks the submodule out at it**. Without a new tag it would pin the
submodule back to v3.7.2 — reverting the very fix this release is meant to carry.

The provider image published for this release is therefore functionally
identical to 3.7.2; the payload is the widget bundle.

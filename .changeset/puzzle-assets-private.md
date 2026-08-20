---
"@prosopo/puzzle-assets": patch
---

chore(puzzle-assets): mark private to unblock changeset publish

`@prosopo/puzzle-assets` was never published to npm (registry returns
404). `publish_release` calls `npx changeset publish` which walks every
non-private workspace; the trusted-publisher OIDC flow only works for
packages that already exist on the registry, so the first-time publish
hit `ENEEDAUTH` and aborted the whole job — that's why v3.7.15, v3.7.16
and v3.7.17 all failed at the same step and never published the docker
image tags either.

`puzzle-assets` is only consumed inside the workspace (provider bundles
it into the CLI docker image); it has no external consumers, so mark it
`private: true`. changeset skips private packages by design, so the
release pipeline goes green without needing a legacy npm token or a
manual bootstrap publish.

If we ever want to publish it externally, drop `private` and either
seed a first publish with a legacy `NPM_TOKEN` or configure the package
as a trusted publisher on npmjs.com first.

# @prosopo/puzzle-assets

## 0.1.2
### Patch Changes

- 572f965: chore(puzzle-assets): mark private to unblock changeset publish
  
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

## 0.1.1
### Patch Changes

- 35f640f: Render puzzle captcha imagery on the provider instead of sending the answer to the client.
  
  The challenge used to carry `targetX`/`targetY` and the widget drew the target box straight from them, so any HTTP client could echo the coordinates back as its solution and pass without a browser. The provider now synthesises a background procedurally, cuts the notch into the pixels, and returns the background and piece as data URIs; the target and the tolerance never leave the server.
  
  Backgrounds come from the new `@prosopo/puzzle-assets` package and are single-use — reusing one across two challenges would let an attacker diff the composites and recover both notch positions.

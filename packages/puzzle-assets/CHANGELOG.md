# @prosopo/puzzle-assets

## 0.1.4
### Patch Changes

- 6fd727c: Publish `@prosopo/native-merkle` and `@prosopo/puzzle-assets` to npm instead of keeping them private.
  
  These are the last two entries in `@prosopo/provider`'s `dependencies` that carried `"private": true` and so were never published. With `@prosopo/native-ja4` already fixed, dropping `private` here makes `npm i @prosopo/provider` resolve for the first time since 5.5.0 — until now it failed with an `E404` on whichever unpublished dependency npm reached first. The Docker image and the bundled CLI build the workspace from source and never resolve these against the registry, which is why the breakage stayed invisible.
  
  `native-merkle` also gains `repository`, because the release workflow publishes with `NPM_CONFIG_PROVENANCE=true` and provenance attestation verifies `repository.url` against the OIDC claim for `prosopo/captcha`. `puzzle-assets` already declared `repository`, `author`, `bugs` and `homepage`, so it needed only the `private` line removed.
  
  Neither tarball changes shape. `native-merkle` keeps its `files` allowlist of `index.js`, `index.d.ts` and the prebuilt `*.node`, and stays `x86_64-unknown-linux-gnu` only — it resolves on linux-x64-gnu and throws napi's "Unsupported architecture" elsewhere, exactly as it does inside the workspace today. `puzzle-assets` ships `dist/` with both the root and `./browser` subpath exports, and keeps its `sharp` runtime dependency.

## 0.1.3
### Patch Changes

- a9c0406: Add vite export path
- 9bf4570: Export code for use in the portal

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

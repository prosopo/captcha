---
---

Add a self-hosting guide to the repo.

Until now the only self-hosting instructions lived in a GitHub Discussion comment, and they told people to fork the
repo, edit TypeScript and generate an image dataset. None of that is necessary.

`SELF_HOSTING.md` documents the short path instead: three containers (Mongo, Redis, the published `prosopo/provider`
image), then register your site key with an explicit `--captcha_type pow` or `--captcha_type puzzle`. Setting a
concrete captcha type bypasses the frictionless scoring path, so no bot detector is needed, and neither `pow` nor
`puzzle` needs an image dataset — `pow` has no imagery and `puzzle` generates its own procedurally.

Every step was run end to end against the stock public image before being written down, which turned up two things a
reader would otherwise hit blind:

- `PROSOPO_IPAPI_URL` and `PROSOPO_IPAPI_KEY` must be set even when unused. The config treats `ipApi` as optional but
  its inner fields as required, so leaving them out crash-loops the container on a Zod error.
- The widget bundle takes its environment from `NODE_ENV`, not `PROSOPO_DEFAULT_ENVIRONMENT`. Building with
  `NODE_ENV=production` silently ignores `PROSOPO_PROVIDER_URL_DEVELOPMENT` and points the widget back at Prosopo's
  own fleet, so a self-hoster must build with `NODE_ENV=development` and accept an unminified bundle.

The README section now links to the guide and to the docs site rather than to the Discussion comment.

`image` is covered too, since it works self-hosted as long as you build the dataset. That meant fixing
`packages/datasets-fs/README.md`, which had drifted badly: it documented `generate`, `generateDistinct`,
`generateUnion` and `scale`, none of which are registered commands (the real ones are `generate-v1`, `generate-v2` and
`resize`), used `--data` for flags that are actually `--input`/`--in`, and showed the input files as bare arrays when
they are `{items: [...]}` and `{labels: [...]}`. It was rewritten against the CLI's real `--help` output after running
the full pipeline, which also turned up two traps now documented:

- `generate-v2 --count` defaults to zero, so omitting it writes a dataset with no captchas and exits successfully.
- The provider must be **restarted** after `provider_set_data_set`. It resolves its default dataset once at startup, so
  a dataset uploaded into a running provider is stored but never served — image challenges keep returning
  `No dataset available` until the process restarts.

Also documents image asset signing. The provider can rewrite captcha image URLs into signed or sealed URLs at serve
time, but both are opt-in on `PROSOPO_ASSET_TOKEN_KEY` / `PROSOPO_ASSET_SEAL_KEYS` and `parseCaptchaAssets` falls back
to `item.data` unchanged, so a self-hosted dataset of plain URLs is unaffected. Verified against
`prosopo/provider:3.8.19`, which carries both resolvers: with no asset variables set the image challenge returns the
dataset URL verbatim. The pinned image in the guide is now 3.8.19, the version actually tested.

Docs only — no code changes.

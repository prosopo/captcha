---
"@prosopo/cli": patch
"@prosopo/scripts": patch
---

Fix four things that broke the self-hosting guide for anyone starting from a fresh clone.

- **The `fingerprintjs` submodule used an SSH URL**, so it could only be fetched by someone with GitHub SSH keys. It is
  now HTTPS. The repository is public, so nobody needs credentials for it. Without it `pnpm run build:all` fails.
- **The guide ran the env script before anything was built.** The script imports built workspace packages, so on a fresh
  clone it crashed with `ERR_MODULE_NOT_FOUND`. The guide now clones with `--recurse-submodules` and runs
  `pnpm run build:all` in step 1.
- **Every `docker compose exec` in the guide failed** with "no configuration file provided", because the compose file is
  not named `docker-compose.yml`. `generateSelfHostedEnv.ts` now writes `COMPOSE_FILE=docker-compose.self-hosted.yml`
  into `.env`, which Compose reads on its own, so plain `docker compose` commands work.
- **The provider CLI exited 0 on a command it did not have.** An older image given `detector_pool_set` did nothing and
  reported success. It now fails with `Unknown command`.

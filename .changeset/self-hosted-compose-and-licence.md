---
---

Ship the self-hosted compose file, and state the licence and integrations where a reviewer will find them.

Follows #3319, which documented self-hosting but still left the reader pasting a compose file out of a web page.

`docker-compose.self-hosted.yml` now ships at the repo root: Mongo, Redis, the provider and Caddy, reading the `.env`
that `generateSelfHostedEnv.ts` writes. Standing it up is three commands from a clean clone.

It sits at the **root**, not in `docker/`, because Docker Compose resolves its project directory from the compose
file's location. From `docker/` the `env_file: .env` and the Caddyfile mount would both resolve against `docker/`
rather than the repo root, so the generated `.env` would be ignored, the `${PROSOPO_DATABASE_USERNAME}` interpolation
would silently produce empty strings, and Mongo would start with blank credentials. At the root everything resolves
and the command stays a plain `docker compose -f docker-compose.self-hosted.yml up -d`.

Deliberately separate from `docker/docker-compose.provider.yml`, which is Prosopo's own fleet stack and carries wiring
a self-hosted node neither has nor needs: two provider versions side by side, a DNS sidecar, an eBPF TCP probe, an
ipinfo blob that ships separately, and per-host certificate mounts rendered by Ansible.

Verified by booting it from a clean `.env`: provider healthy, site key registered, puzzle challenge served.

Also states **Apache-2.0** at the top of the README and adds an integrations table. A public comparison of self-hosted
captchas recorded our licence as "unclear" and did not mention our integrations at all — both facts were already in the
repo, just nowhere a reviewer would look. The integrations list (React, Vue, Svelte, Angular, Next.js, `@prosopo/server`,
the WordPress plugin's fifteen form integrations, and the edge workers) is more than several of the alternatives in that
comparison offer, and none of it was visible from the front page.

---
---

Split the docker compose files into a base file plus overlays instead of profiles and near-duplicate copies.

- `docker-compose.provider.yml` no longer uses profiles. It is the base stack, layered with `docker-compose.provider.<production|staging|development>.yml` and optionally `docker-compose.provider.tcp-probe.yml` (the eBPF sidecar, previously the `tcp-probe` profile). The production/staging profiles were on every app service, so on those hosts they selected everything; the env overlays are empty placeholders for future per-env overrides. Running the base file with no profile used to start only redis and ipinfo. It now starts the whole stack.
- `provider-mock` and `client-example-server` drop their profiles the same way and gain empty `.production`/`.staging` overlays.
- `docker-compose.oo1.yml` and `docker-compose.oo2.yml` are now overlays on a shared `docker-compose.oo.yml`. The OpenObserve service in instance 1 is renamed from `oo1` to `oo`; its container is still named `oo1`, so `oo1.Caddyfile` is unchanged.
- `docker-compose.development.yml` was byte-for-byte the same as `docker-compose.test.yml` and is removed; use `docker-compose.test.yml`.
- `docker/redis/redis-stack*.docker-compose.yml` become `docker-compose.redis.yml` plus a `.dev` (Insight UI, password `root`) or `.server` (persistent, env-file password) overlay.

Each file's header comment shows the `-f` order to use. Rendered with `docker compose config`, every new combination matches the old invocation apart from the two service renames above.

Anything running `docker compose --profile production|staging|tcp-probe` against these files must switch to `-f` overlays; captcha-private's Ansible playbooks are updated alongside this.

---
---

Cut the provider image from 1.84 GB to 376 MB, and drop the shell from it.

Almost all of the old size was the base. `node:24` is 1.63 GB — 89% of the image — and ships a build toolchain this
container never uses: it runs a pre-bundled JS file and installs one dependency from a prebuilt binary. Our own layers
only ever accounted for ~137 MB.

The build is now two stages. A `node:24-slim` builder does everything that needs a shell, apt or the network — install
curl, fetch the three GeoLite2 databases, `npm i sharp` — and the runtime stage is `gcr.io/distroless/nodejs24-debian12`
with the result copied in. Nothing but the Node runtime, the bundle and sharp reaches the final image.

Smaller things folded in: the three GeoLite `RUN`s are one layer instead of three, and the npm cache is cleaned in the
layer that creates it.

**Alpine was rejected, not overlooked.** All four native addons are `linux-x64-gnu` — `@img/sharp`,
`@prosopo/native-ja4`, `@prosopo/native-merkle`, `@prosopo/native-puzzle` — and musl needs separately compiled
binaries. The distroless runtime is Debian 12, matching the builder, so the glibc the addons were resolved against is
the one that loads them.

## Breaking for operators

There is no shell, no `npm` and no `npx` in the runtime image. `npx provider <command>` was only ever human
convenience; every call site has been moved to an explicit node invocation:

```bash
docker exec provider1 /nodejs/bin/node /usr/src/app/provider.cli.bundle.js <command>
```

Updated here: `SELF_HOSTING.md`, `packages/datasets-fs/README.md`, and the `provider_image` CI smoke test (which ran
`/bin/sh -c '... npx provider version'` and would otherwise have failed on the first build). Healthchecks in
`docker/docker-compose.provider.yml` for both provider containers no longer use `curl` — it is not in the image — and
run `node -e "fetch(...)"` instead. The matching ansible playbooks (`providerEnsureIndexes`,
`providerLoadDataset`, `providerMigrateIps`, `providerUpdateSpamEmailDomains`) and `RUNBOOK.md` are updated in
captcha-private.

Healthchecks in `docker-compose.self-hosted.yml` move to node for the same reason.

`docker exec -it provider1 bash` no longer works. That is the real cost of this change.

## Verified

Built all three variants from the same bundle and ran the distroless one as a full stack against Mongo and Redis:

- boots; `/healthz` ok; the node-based container healthcheck reports `healthy`
- MaxMind City and ASN readers initialise
- CLI works via explicit node: `version`, `ensure_indexes`, `provider_set_data_set` (dataset loads), `site_key_register`
- all three captcha types serve — `pow`, `puzzle` (29 KB WebP, so sharp renders), `image` from a loaded dataset with
  `signature` present
- zero `error` or `fatal` lines in the provider log

## Runs as non-root

The runtime stage is `gcr.io/distroless/nodejs24-debian12:nonroot` — uid/gid 65532 — and the copied application tree
is chowned to that user. The container no longer runs as root.

This has a hard deployment prerequisite on the fleet. The provider writes at runtime to a host bind mount
(`./data/detector-pool.N` → `/app/data/detector-pool`): the pool-replace admin endpoint does `mkdir` + `writeFile`,
and `assignSecret` drops a `0600` secret alongside. Those directories are root-owned today, and docker auto-creates
them as root on `up`. Confirmed by running the non-root image against both: a root-owned pool directory fails every
write with `EACCES`, and the same directory chowned to 65532 writes fine at mode `600`.

**That failure is silent.** An unwritable or unreadable pool is not an error — `getDetectorBundlePool()` returns empty
and `runEmptyDetectorPoolPowFallback` serves proof of work instead, so scoring would degrade fleet-wide with nothing
in the logs to explain it.

The matching ansible task (captcha-private) creates and chowns both pool directories, and **must be deployed and
verified before this image reaches any pronode.**

Self-hosted deployments are unaffected: `docker-compose.self-hosted.yml` mounts no pool directory, so the path is
created inside the container by the runtime user.

Privileged ports are a non-issue — Docker sets `ip_unprivileged_port_start=0`, and the API listens on
`PROSOPO_API_PORT` (9229) with Caddy fronting 80/443 regardless.

## Remaining

Moving the GeoLite2 databases to a mounted volume would take this to ~290 MB — deliberately separate because it
changes how the image is operated.

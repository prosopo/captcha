---
"@prosopo/scripts": patch
"@prosopo/datasets-fs": patch
---

Self-hosting no longer needs a Rust toolchain. The guide used `pnpm run build:all`, which also compiles the provider's Rust addons and fails without `cargo`, even though the provider runs from the prebuilt image and nothing built on the host uses those addons. The new `pnpm run build:self-hosted` builds only what the env script and the widget need. `build:all` is unchanged.

`docker-compose.self-hosted.yml` now sets `platform: linux/amd64` on the provider and Caddy, because those images are only published for amd64; the guide says ARM hosts run them under emulation. Its default Caddy image moves from 2.5.9 to 2.5.12: `docker/provider.Caddyfile` uses `crawler_list`, which 2.5.9 does not have, so Caddy would not start.

The `@prosopo/datasets-fs` `cli` script pointed at `dist/esm/cli.js`, which the build never writes. It now runs `dist/tsc/cli.js`, the file `build:tsc` writes, and the guide and the package README build and run the CLI that way.

Other corrections in the guide: the detector example runs `bundle` (`detector-botd` has no `build` script), and the expected startup log line is `bundle pool loaded {"count":0}`.

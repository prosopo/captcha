---
"@prosopo/scripts": patch
---

Self-hosting no longer needs a Rust toolchain. The guide used `pnpm run build:all`, which also compiles the provider's Rust addons and fails without `cargo`, even though the provider runs from the prebuilt image and nothing built on the host uses those addons. The new `pnpm run build:self-hosted` builds only what the env script and the widget need. `build:all` is unchanged.

`docker-compose.self-hosted.yml` now sets `platform: linux/amd64` on the provider and Caddy, because those images are only published for amd64; the guide says ARM hosts run them under emulation. The guide's detector example now runs `bundle`, as `detector-botd` has no `build` script.

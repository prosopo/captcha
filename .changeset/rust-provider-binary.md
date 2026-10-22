---
"@prosopo/cli": patch
---

Add the `prosopo-provider` Rust binary: it reads the same environment as the Node CLI and, with `--api`, serves the routes ported to Rust so far (health check, provider details, metrics) so it can run beside the Node provider in shadow mode. It leaves start-up cleanup, migrations and scheduled jobs to the Node provider. A start-up failure exits with status 1, where the Node CLI exits 0. The TypeScript is unchanged.

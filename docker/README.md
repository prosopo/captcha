# Docker

Various compose files for running Prosopo services

Each deployable stack (provider, provider-mock, oo, client-example-server,
redis, mongo) is its own folder with a package.json, so changesets versions it
and a release publishes its files as GitHub release assets. Relative paths in
these files (`./data`, `../.env.1.${NODE_ENV}`) refer to the deploy host, where
ansible copies every bundle flat into one `docker/` folder — not to this repo.

`pnpm run lint:docker` checks every bundle: compose files must parse and
Caddyfiles must be in `caddy fmt` form. It needs docker.

## ARM64

Mongo dropped support for ARM < 8 so we need to use unofficial releases
from [here](https://github.com/themattman/mongodb-raspberrypi-docker?tab=readme-ov-file) for Raspberry Pi 4 and below.

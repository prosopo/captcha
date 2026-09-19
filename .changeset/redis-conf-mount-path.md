---
---

fix(docker): mount the redis config that actually exists

`docker-compose.test.yml` and `docker-compose.development.yml` mount `./redis.conf`, but relative to those files that resolves to `docker/redis.conf`, which is not in the repo — the file is `docker/redis/redis.conf`. Docker does not fail on a missing bind source: it creates an empty *directory* at the path and mounts that over `/redis-stack.conf`, so redis has been starting on `REDIS_ARGS` alone and silently ignoring the config, while leaving a stray `docker/redis.conf/` directory behind on every host that ran it.

The two sibling files in `docker/redis/` get the path right because they sit next to the config; the ones a directory up do not.

With the path corrected, redis in test and development picks up what the config was written to set: `appendonly yes`, `maxmemory 2gb` and `maxmemory-policy allkeys-lru`.

`docker-compose.provider.yml` has the identical broken path and is deliberately left alone here — see the PR description. Fixing it changes how production redis handles memory pressure, which should land on its own.

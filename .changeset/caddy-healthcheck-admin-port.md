---
---

Point the Caddy healthchecks in the oo1, oo2, client-example-server and
provider-mock compose files at the admin API's real port, 2020. Their
Caddyfiles moved the admin API off the default 2019, but the healthchecks still
curled `localhost:2019/metrics`, which always fails, so those Caddy containers
were permanently reported unhealthy.

---
---

Fix the OpenObserve and Caddy healthchecks on oo1/oo2, which always reported unhealthy.

Both checks ran `curl`, which neither image ships, and the Caddy check also used port 2019 while the admin API listens on 2020. OpenObserve is now probed with its own `openobserve node status` command and Caddy with `wget` against the admin API metrics endpoint.

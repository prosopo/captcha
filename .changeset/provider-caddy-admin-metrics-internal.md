---
---

Keep the provider Caddy's admin API and metrics off the network.

The admin API listened on `:2020`, so any container on the pronode docker
networks (provider, ipinfo, dns, vector, redis) could read or replace the whole
proxy config, or stop Caddy, with a plain HTTP request. It now listens on
`localhost:2020`; the compose healthcheck and the certbot hook's
`caddy reload` both run inside the container and keep working.

Caddy's Prometheus metrics were also served on the public provider site at
`/metrics` (and `/METRICS`, `/Metrics`). They are removed from the public site;
the internal `:9090` listener that vector scrapes is unchanged.

The same admin binding fix is applied to the openobserve (`oo1`, `oo2`),
`client-example-server` and `provider-mock` Caddyfiles, and the last two also
stop serving `/metrics` publicly. The staging and test env files set
`CADDY_ADMIN_API=:2020` explicitly, which would override the new default, so
they now use `localhost:2020` as well.

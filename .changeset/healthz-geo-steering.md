---
"@prosopo/provider": minor
"@prosopo/ipinfo": minor
"@prosopo/types-env": minor
---

Optionally answer `/healthz` with the node nearest the caller.

`/healthz` tells a client which node to pin its captcha calls to, and a node has always answered with its own name — so the pin is whatever the DNS layer picked. The DNS layer only sees the client's address when the client's resolver forwards it, which many do not. The provider always sees it, because the connection is already open.

Behind `PROSOPO_HEALTHZ_GEO_STEERING`, off by default. With it off nothing in this change runs and the response is unchanged, headers included.

- `IpInfoService.country(ip)` is a new MaxMind-only fast path: an in-process, synchronous read of the memory-mapped database, returning an ISO 3166-1 alpha-2 code or `undefined`. `lookup()` is unchanged and still prefers ipapi.is for its threat data; a country lookup does not need that data and must not pay a network call for it. Added to `IIpInfoService` in `@prosopo/ipinfo` and `@prosopo/types-env`.
- The country → host map is configuration, supplied by the deployment as JSON in `PROSOPO_HEALTHZ_GEO_ROUTES`. It is also the candidate set: a host that must not receive traffic simply does not appear in it. An unparseable or empty map leaves steering off rather than failing startup.
- A background poller (`PROSOPO_HEALTHZ_GEO_PROBE_INTERVAL_MS`, `PROSOPO_HEALTHZ_GEO_PROBE_TIMEOUT_MS`) tracks each candidate's health. Every candidate starts down and only becomes up on a successful probe, so a poller that has not run or is failing leaves steering off. The request path reads a boolean and never awaits a probe.
- The handler never awaits readiness. It reads `ipInfoService.isAvailable()`, which is false before the environment is ready, and answers with its own name. Loopback and private-range callers — deploy gates, container health checks — short-circuit the same way. `/healthz` stays dependency-free.
- `Cache-Control: no-store, private` is set whenever steering is on, before the decision, so it covers every branch. The answer varies per caller and no intermediary may cache and replay it.
- `prosopo_healthz_geo_outcomes_total{outcome}` on `/metrics` counts `steered`, `not_steered`, `target_down` and `geo_unavailable`. Every outcome but the first falls back to the node's own name, which is also the behaviour with steering off, so nothing else would show that steering had stopped working.

No client-side change: the load balancer already pins to whatever `host` the response carries.

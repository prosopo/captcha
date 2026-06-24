---
"@prosopo/provider": minor
"@prosopo/types": minor
---

Add a Prometheus `/metrics` endpoint to the provider/pronode API and instrument the captcha pipeline with a full metrics suite via `prom-client`. The endpoint is served on the existing internal API port (added to `PublicApiPaths`), gated by `PROSOPO_METRICS_ENABLED` (default on), and scraped by Vector over the internal docker network.

Exposes: HTTP request counts/durations by route/method/status; captcha issued and verify outcomes by type/result/source; frictionless routing decisions; bot-score distribution and triggered detectors; blocked-request, domain-validation and spam-email outcomes; maintenance-mode and redis-readiness gauges; and default Node process metrics. High-cardinality identifiers (site key, user, IP, session) are kept out of labels and remain in the structured logs.

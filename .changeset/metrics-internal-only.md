---
"@prosopo/provider": minor
---

`/metrics` is no longer open to everyone by default. Without `PROSOPO_METRICS_TOKEN`, only direct requests from loopback or private addresses are served, such as a scraper on the docker network. Requests relayed by a reverse proxy (they carry `X-Forwarded-For`, `Forwarded` or `X-Real-IP`) get 403. With `PROSOPO_METRICS_TOKEN` set, any caller with `Authorization: Bearer <token>` is served, as before. The token is now compared in constant time. Set `PROSOPO_METRICS_PUBLIC=true` to keep the old open endpoint. A scraper that reaches the provider through a proxy or from a public address needs either the token or that flag.

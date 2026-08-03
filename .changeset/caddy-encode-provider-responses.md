---
"@prosopo/provider": patch
---

perf(caddy): compress proxied provider responses with zstd/gzip

`docker/provider.Caddyfile` had no `encode` directive, and Caddy does not
compress by default, so every proxied response went out uncompressed. The
detector-pool bundle makes that expensive: ~830 KB of obfuscated JS returned
inline from `/detector/assign` once per frictionless session.

Obfuscated output still compresses well (the obfuscator's string-array encoding
is highly repetitive) — 2.6x with gzip, 3.1x with zstd. At 15k sessions/hour a
single provider drops from ~9.15 TB/month of egress to ~3 TB.

zstd is preferred with gzip as the fallback. Responses below `minimum_length`
(512 bytes) are untouched, which covers every small JSON reply the API returns.

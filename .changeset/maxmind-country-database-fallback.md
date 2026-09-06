---
"@prosopo/ipinfo": patch
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Make the MaxMind fallback answer lookups instead of silently failing all of them.

`MaxMindBackend` was configured with `cityDbPath` pointing at `GeoLite2-Country.mmdb` (`MAXMIND_DB_PATH`), and only ever called `city()`. `Reader.open()` accepts any valid `.mmdb`, so the reader opened, `isAvailable()` reported `true`, and the backend advertised itself as a working fallback — but `city()` checks `metadata.databaseType` and throws `BadMethodCallError` against a Country database. The throw was swallowed at `debug` level, `asnReader` was never configured because nothing read a path for it, and every lookup fell through to `{ isValid: false, error: "No MaxMind data available for IP" }`.

The failure was invisible for as long as ipapi.is was up, because `IpInfoService` only reaches MaxMind when the ipapi.is lookup fails. When the self-hosted ipapi.is sidecar went down on five production provider nodes, IP lookups did not degrade to MaxMind — they failed outright, and `compareIPs` returned "Failed to lookup both IP addresses" for every request whose challenge IP differed from its solution IP.

Three changes:

- `MaxMindBackend` latches the database kind on the first `BadMethodCallError` and uses `country()` from then on, so a Country database yields country and country code rather than nothing. The latch means the rejection is constructed once per process, not once per request, and a genuine City database never pays for a second lookup. The mismatch is logged once at `warn` with the offending path, because silent degradation is what let this sit unnoticed.
- `maxmindAsnDbPath` is read from `MAXMIND_ASN_DB_PATH`. The image has downloaded `GeoLite2-ASN.mmdb` alongside City and Country since the Dockerfile was written, but nothing ever opened it, so the fallback could not name a provider or an AS number.
- `deepValidateIpAddress` logs `ip1Error` and `ip2Error` alongside the top-level comparison error. "Failed to lookup both IP addresses" on its own does not distinguish an IP that is absent from the database from a backend that is down, and diagnosing the difference meant going onto the host.

Deployments should also point `MAXMIND_DB_PATH` at `GeoLite2-City.mmdb`, which the image already ships: country-level data is enough for geoblocking but carries no coordinates, so the IP distance rule cannot run against it.

---
"@prosopo/cli": patch
---

DNS sidecar event merge: atomic dotted-path `$set` so DNS + HTTP legs co-occur on one session (was clobbering: prior projection omitted `dnsEvent`, every write started from `undefined`). Caddy now forwards PROXY-protocol v2 on the `*.t.{domain}` route and the sidecar (≥0.1.6) reads it, so `dnsEvent.peerIp` records the real client IP instead of the docker bridge address.

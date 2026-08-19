---
"@prosopo/provider": patch
---

fix(provider): raise MAX_NS cap in rawTlsSignalsMiddleware so long-uptime
hosts don't lose the kernel monotonic timestamps

Kernel `bpf_ktime_get_ns()` crosses `Number.MAX_SAFE_INTEGER` (2^53)
after ~104 days of uptime. The v3.7.17 middleware capped at that
ceiling, so on any pronode with a longer uptime every `synNs` /
`synackNs` / `ackNs` header was rejected as malformed and the raw
timings never reached the Session record. Confirmed on staging where
the first pronode had ~119 days of uptime — every incoming request
logged `Ignoring malformed raw TLS signal header` for the three ns
fields while the TTL / MSS / wscale / opts / window fields landed
fine. Cap at 2^63 so real timestamps get through; downstream
consumers subtract before use, so the ns-level precision loss above
2^53 is a non-issue.

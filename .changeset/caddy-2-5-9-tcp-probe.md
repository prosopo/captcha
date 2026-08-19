---
"@prosopo/caddy-docker": patch
---

chore(caddy-docker): bump image to 2.5.9

Rebuilds `prosopo/caddy` against the latest `github.com/prosopo/chaddy`,
which now exposes a `tcp_probe_socket` global option. When set, chaddy
performs a per-request lookup against a co-located eBPF probe's Unix
socket and forwards the raw TCP handshake signals (`X-TLS-Syn-Ns`,
`X-TLS-Synack-Ns`, `X-TLS-Ack-Ns`, `X-TLS-Observed-Ttl`, `X-TLS-Tcp-Mss`,
`X-TLS-Tcp-Wscale`, `X-TLS-Tcp-Opts-Flags`, `X-TLS-Tcp-Opts-Order`,
`X-TLS-Tcp-Window`) on the reverse-proxy request. Lookups are bounded at
50 ms and drop cleanly on miss/timeout — the request continues without
the extra headers. Unset by default: existing deploys are unaffected.

Image published as `prosopo/caddy:2.5.9` and re-tagged `:latest` on
Docker Hub.

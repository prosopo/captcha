---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/cli": patch
---

Integrate the prosopo/dns sidecar against the procaptcha provider.

- New admin endpoint `POST /v1/prosopo/provider/admin/dns/event` ingests batched DNS observation events from the sidecar (auth: admin sr25519 JWT) and merges resolver / peer IPs onto the matching Session record under a new `Session.dnsEvent` field.
- Frictionless response carries a per-session `dns_url` when the pronode has `DNS_EVENT_SUBZONE` + `DNS_EVENT_HMAC_SECRET` set. The HMAC path mirrors the sidecar's Rust implementation so both sides agree without shared per-request state.
- The frictionless bundle fires one no-cors GET to `dns_url` on detection completion (fire-and-forget; failures never affect the captcha flow).
- Deploy compose entry for the sidecar plus a Caddy `layer4` SNI-passthrough block so the sidecar terminates TLS itself (no Cloudflare token needed). Caddy image must be rebuilt with the `caddy-l4` plugin.

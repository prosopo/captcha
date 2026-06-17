---
"@prosopo/ipinfo": patch
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

feat(traffic-filter): allowlist datacenter operators by name

Apple's iCloud Private Relay exits from datacenter IPs, so sites with
`blockDatacenter: true` were dropping legitimate Safari traffic. ipapi
already reports the operator name verbatim in `datacenter.datacenter`
— expose it on `IPInfoResult.datacenterName` and let `TrafficFilter`
carry an optional `datacenterNameAllowlist` so operators can opt the
relay traffic through without disabling the rest of the rule. Match
is case-/whitespace-insensitive; the allowlist only suppresses the
datacenter check, so a VPN/Tor/Proxy/Abuser hit on the same IP still
blocks. New field is wired through Zod (capped 50 × 128 chars) and
the Mongoose client settings schema so it persists.

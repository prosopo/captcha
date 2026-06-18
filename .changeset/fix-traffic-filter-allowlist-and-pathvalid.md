---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

Traffic-filter `datacenterNameAllowlist` now matches `datacenterName`, `providerName`, or `asnOrganization` (was: `datacenterName` only). Lets the allowlist reach IPs where upstream sets `is_datacenter: true` without populating `datacenter.datacenter`.

New opt-in `trafficFilter.skipExtrasOnValidDnsPath` (default `false`): when on and `dnsEvent.pathValid === true`, skip the filter evaluation on the DNS peer and resolver IPs.

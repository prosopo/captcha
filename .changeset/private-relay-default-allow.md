---
"@prosopo/provider": patch
"@prosopo/types": patch
---

Let iCloud Private Relay users through the datacenter traffic-filter rule by default.

Relay sends Safari users on iPhone, iPad and Mac out through Apple's partner CDN servers, so ipinfo flags them as datacenter, and a site that blocked or challenged datacenter traffic caught every relay user. Each relay IP is shared by many real people. Relay is now treated as if it were on every site's `datacenterNameAllowlist`, both for the visitor's own IP and for the DNS-path check. A site that wants relay treated as datacenter traffic again adds "iCloud Private Relay" to `datacenterNameDenylist`, which already wins over the allowlist.

A relay IP that passes the datacenter rule also skips the lower categories (abuser, crawler, satellite, mobile). Its abuser score belongs to the shared CDN server, and every site has an abuser block at submit. Without this, letting relay through the datacenter rule would have exposed relay users to that block, which the datacenter step used to stop them reaching. Relay IPs that ipinfo also flags as VPN, proxy or Tor are still caught by those rules.

The DNS-asymmetry score stored when a DNS event arrives was worked out without the site's filter, and the verify-time recompute only ever raises it. Relay resolvers now count as clean there too, so a relay session no longer carries a datacenter-resolver penalty into its frictionless score.

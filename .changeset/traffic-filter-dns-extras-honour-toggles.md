---
"@prosopo/provider": patch
---

fix(provider): DNS-enriched extras now honour traffic filter toggles

`checkTrafficFilter` previously applied the "VPN on datacenter" suppression only to the primary request IP: the enriched DNS peer/resolver IPs still tripped `DATACENTER_BLOCKED` even when the operator had `blockVpn` off. Real-world impact: Surfshark (and similar) users whose primary IP was a `providerType=isp` datacenter passed the primary check, but their DNS resolver — also on a datacenter range flagged as VPN — was blocked. The extras path silently overrode the operator's toggles.

Changes:

- Extras now go through the same evaluator as the primary IP — the internal `EvaluateOptions` / `suppressVpnDatacenterInteraction` split is gone.
- Datacenter suppression is extended from VPN to all four overlapping categories: VPN, proxy, Tor, and crawler. If any of those flags is set on the IP and the operator has that specific `block*` toggle off, the datacenter rule is suppressed. Same rationale as the original VPN carve-out — those categories live on datacenter infrastructure by design.
- Crawler check is skipped entirely on DNS extras. Public DNS resolvers like `8.8.8.8` and `1.1.1.1` share IP ranges with search crawlers, so `is_crawler=true` on a resolver is the resolver, not a crawler visiting the endpoint.

Unit tests updated (`checkTrafficFilter.unit.test.ts`): the "does NOT apply VPN-datacenter suppression to extra IPs" test was flipped to assert the new behaviour, and coverage added for proxy/Tor/crawler suppression on both primary and extras, plus the extras-only crawler-skip.

---
"@prosopo/provider": minor
---

Rework the traffic-filter evaluation so that on a single IP the
highest-precedence set flag decides the outcome — only that category's
policy is consulted, and lower-precedence flags on the same IP are
ignored. Precedence (highest first): tor > vpn > proxy > datacenter >
abuser > crawler > satellite > mobile.

Example: an IP flagged as VPN and proxy is treated as VPN. If the
operator has left the VPN policy unconfigured (allowing VPNs), the IP
passes even when the proxy policy is set to block — the "specific"
category owns the IP and its policy is the only one that fires.

Behaviour change to flag: because datacenter now outranks crawler, a
crawler+datacenter IP is acted on by the datacenter policy regardless
of the crawler policy state. Operators who want to allow named crawlers
through can still use `datacenterNameAllowlist`.

`computeDnsAsymmetry` (DNS resolver / peer IP scoring) keeps its
existing operator-policy-aware shielding rather than mirroring
precedence, because DNS resolvers are legitimately often on datacenter
ranges (Google/Cloudflare/consumer-VPN DNS) — the DC signal there only
counts when the operator would have acted on the underlying category
too.

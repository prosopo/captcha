---
"@prosopo/provider": minor
---

Extend `checkTrafficFilter` to accept an optional `extraIpInfos` list and apply the same per-rule checks across additional IPs. Each verify path threads `session.dnsEvent` IPs through `resolveTrafficFilterCheck` so its peer / resolver enrichments are evaluated alongside the primary client IP.

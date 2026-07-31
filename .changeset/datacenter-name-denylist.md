---
"@prosopo/provider": patch
"@prosopo/types": patch
"@prosopo/types-database": patch
---

feat(traffic-filter): add `datacenterNameDenylist` alongside the existing allowlist

Operators can now name datacenter / provider / ASN organisations they want
force-included in the datacenter block, mirroring the shape of
`datacenterNameAllowlist`. Denylist entries take precedence over the
`providerType === "isp"` short-circuit and over the allowlist for the same
name, so operators can opt named providers back into the datacenter rule when
upstream classifies them as ISP.

Same case-insensitive / whitespace-trimmed matching, same three name sources
(`datacenterName`, `providerName`, `asnOrganization`), same
`MAX_DATACENTER_ALLOWLIST_ENTRIES` / `MAX_DATACENTER_ALLOWLIST_ENTRY_LENGTH`
validators. Missing or empty denylist preserves existing behaviour.

Wired through the mongoose `ClientSettings.trafficFilter` schema, the zod
`TrafficFilterSchema`, `checkTrafficFilter`, and `enrichDnsEvent.countDc` so
the denylist is honoured on both the primary rule and the DNS-asymmetry
scoring. Unit tests cover the ISP-bypass override, the allowlist-precedence
edge case, category-suppression interaction, and the extras path.

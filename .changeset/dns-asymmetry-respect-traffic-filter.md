---
"@prosopo/provider": patch
---

fix(provider): `computeDnsAsymmetry` respects the site's traffic filter

The DNS-path scorer previously counted `isDatacenter` and `isAbuser` on the
resolver / peer IPs unconditionally, so a site with `blockDatacenter=off`,
`blockVpn=off` (or any of the other category toggles off), or an entry in
`datacenterNameAllowlist` on the client side could still get a datacenter
penalty on the DNS side. The client-side `evaluateIpInfo` has honoured
these knobs for a while — the DNS-side scorer just never got the update.

Changes:

- `computeDnsAsymmetry` now accepts an optional
  `trafficFilter?: Partial<ITrafficFilter>` and gates its `isDatacenter` /
  `isAbuser` contributions on the same rules `evaluateIpInfo` uses:
  `blockDatacenter` opt-in, `providerType !== "isp"` short-circuit,
  `datacenterNameAllowlist`, `blockAbuser` + `abuserScoreThreshold`.
- Cross-category suppression mirrored: VPN / proxy / Tor / crawler IPs that
  also carry `isDatacenter=true` are not counted as datacenter when the
  operator has left the more specific category unblocked.
- `pathValid=false` remains unconditional — it's a protocol signal, not a
  category.
- `trafficFilter` is threaded through `powTasks`, `imgCaptchaTasks`, and
  `puzzleTasks`. The admin recompute endpoint (`apiDnsEventEndpoint`)
  intentionally stays raw with a comment explaining why: diagnostic
  recompute should not depend on the site's current filter config.
- `isDatacenterAllowlisted` is exported from `checkTrafficFilter.ts` so
  `enrichDnsEvent` reuses the same matching rules.
- When `trafficFilter` is omitted (admin path), the pre-existing scoring
  behaviour is preserved.

Unit tests cover cross-category suppression for all four categories,
`blockDatacenter=off`, `providerType==="isp"`, name allowlist,
`blockAbuser=off`, abuser-score threshold, `pathValid=false` still firing,
client-ISP compound suppression, and the legacy no-trafficFilter path.

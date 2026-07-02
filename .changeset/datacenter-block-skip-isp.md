---
"@prosopo/provider": patch
---

fix(provider): skip the datacenter traffic-filter block when upstream classifies the provider as a consumer ISP (`providerType === "isp"`).

Motivation. Consumer ISPs like Afrihost (AS37611), Comcast, and BT are occasionally flagged `is_datacenter=true` by the upstream classifier because part of their ASN hosts B2B or hosting services, but the eyeball ranges behind those ASNs carry ordinary end-users. Observed on prod at commitment `0xd3f919c0…fa03` (provider `pronode15`): a real user in Johannesburg on `165.73.62.88` was rejected with `API.DATACENTER_BLOCKED` despite the same payload reporting `providerType: "isp"` and `asnOrganization: "AFRIHOST SP (PTY) LTD"`. The `providerType` categorisation is stronger evidence of consumer traffic than the `isDatacenter` boolean.

- `checkTrafficFilter` short-circuits the datacenter rule when `ipInfo.providerType === "isp"`. Missing `providerType` preserves the previous behaviour.
- Earlier rules (VPN, Tor, proxy, abuser) still fire first, so the ISP flag cannot be used to bypass those checks.
- Suppression applies to both the primary IP and the extras list.

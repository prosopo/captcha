---
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/provider": minor
---

Every traffic-filter category (VPN, proxy, Tor, abuser, datacenter, mobile, satellite, crawler) now has the same two name lists. `nameAllowlist` takes a matching network out of that category, for example letting "VPN by Google" past a VPN block. `nameDenylist` keeps a matching network in that category even when it would otherwise be let out. Until now only the datacenter category had these lists. The old top-level `datacenterNameAllowlist` and `datacenterNameDenylist` still work and count as the datacenter category's lists. iCloud Private Relay is let through by every category except Tor unless a site denylists it.

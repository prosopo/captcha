---
"@prosopo/provider": patch
---

fix(provider): skip city and distance IP validation rules for same trusted provider

Dual-stack and CGNAT subscribers routinely egress via different POPs of the same operator (e.g. AT&T's BellSouth v4 pool + AT&T Internet v6 pool — distinct ASNs but identical `company.name` from ipapi). The city-change and distance-exceed rules previously fired on such traffic, producing PoW captcha rejections with `City changed from Laredo to Los Angeles; IP addresses are 1930km apart` even though the ISP-change rule correctly recognised the provider match.

`evaluateIpValidationRules` now gates the city-change and distance-exceed rule blocks on a `sameTrustedProvider` precondition: both providers match (non-`"Unknown"`), same `countryCode`, and neither endpoint is a datacenter (guards against AWS/Cloudflare same-`company.name` false negatives where "same corporate owner" absolutely does not mean "same subscriber"). Country-change, ISP-change, VPN/proxy, and abuse-score rules are unchanged.

---
"@prosopo/provider": patch
---

iCloud Private Relay users are no longer blocked by a site's VPN or proxy rule. Our IP data provider has started marking some Private Relay addresses as VPNs, so sites that block VPNs were turning away ordinary iPhone users. Private Relay addresses are now exempt from every traffic-filter category except Tor, unless the site owner names Private Relay in `datacenterNameDenylist`.

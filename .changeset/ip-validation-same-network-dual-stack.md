---
"@prosopo/provider": patch
---

IP validation no longer rejects real users whose address changes in two common, harmless ways between solving the captcha and the site verifying the token.

A neighbouring address on the same network is now treated as a match: the same /64 for IPv6 (privacy addresses rotate inside it) or the same /24 for IPv4 (carrier NAT pools hand out neighbouring addresses). Before, any such change was rejected whenever the address's reputation score was at or above the threshold.

An IPv4 address and an IPv6 address in the same country, with neither side a datacenter, VPN or proxy, now skip the ISP, city and distance rules. In some markets the IPv6 leg of a home connection is run by a different operator on a different ASN and geolocates to that operator's hub, so one user looked like an ISP change hundreds of kilometres away. The country and reputation rules still apply to these pairs.

---
"@prosopo/provider": patch
"@prosopo/types": patch
---

A proof-of-work solve is checked against the address the challenge was issued to, and a mismatch sends the user to an image captcha instead of approving them. That check compared the whole IPv4 address, so it fired for anyone whose address moved between asking for the challenge and solving it — which is normal behaviour on mobile and on carrier NAT, where the low octet gets reassigned mid-session. One EE subscriber was seen moving one address along in four seconds.

It now compares the /24, so a reassignment inside the same pool reads as the same place on the network. IPv6 already worked this way on the /64, for the same reason, and is unchanged. A solve arriving from a genuinely different network is still caught and still escalates, so the point of the check survives.

Unit tests cover a low-octet reassignment, both ends of a /24, two different /24s, and a pair of adjacent addresses that straddle the /24 boundary.

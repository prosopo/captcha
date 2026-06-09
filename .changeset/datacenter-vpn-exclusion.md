---
"@prosopo/provider": patch
---

`checkTrafficFilter` no longer treats VPN traffic that exits from a datacenter IP as datacenter traffic. Commercial VPNs (Mullvad, NordVPN, ProtonVPN, …) all run on cloud providers, so operators who enabled `blockDatacenter` but not `blockVpn` were silently catching VPN end-users they did not intend to block. The datacenter rule is now suppressed when `ipInfo.isVPN` is true and `blockVpn` is false. Closes prosopo/captcha-private#3479.

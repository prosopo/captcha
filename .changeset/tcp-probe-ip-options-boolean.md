---
"@prosopo/types": patch
"@prosopo/provider": patch
---

Accept the tcp-probe v2 record as the probe actually sends it. The schema expected `syn.ip_options` to be a hex string, but tcp-probe sends a boolean (whether the IP header had options; the bytes are in `raw`). So every record with a saved SYN failed validation and was dropped, and no session ever stored `tcpProbe`.

---
"@prosopo/provider": patch
---

IP validation no longer reports an ISP change when the two addresses share an ASN. Dual-stack users whose IPv6 is delivered by a wholesaler under a different company name (e.g. KDDI customers in Japan, whose IPv6 block is named "Japan Internet Xing") were being rejected with `FAILED_IP_VALIDATION` on sites with `ispChangeAction: reject`. A matching provider name still counts as the same ISP, so operators that use separate ASNs for IPv4 and IPv6 keep passing.

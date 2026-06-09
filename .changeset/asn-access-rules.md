---
"@prosopo/user-access-policy": minor
"@prosopo/provider": patch
---

Add `asn` as a user-scope field for access rules. The captcha provider can now block / restrict by Autonomous System Number, matching what the protect/bumblebee tier already supports. ASN is read from `ipInfo.asnNumber` and threaded through `getRequestUserScope` and `checkForHardBlock` at all challenge entry points. Redis index gains a NUMERIC `asn` field with range-syntax lookups.

---
"@prosopo/provider": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
---

Surface dnsEvent observations across the verify and frictionless flows. Each verify path now enriches the session's dnsEvent IPs once and passes the result to the traffic filter, decision machine, IP validation, and usage counters. Adds `scoreComponents.dnsAsymmetry` (Zod + TS interface + mongoose) computed from resolver / peer ipInfo plus path validity, with the score patched onto the session at DNS event ingest time so it weights subsequent reads. Adds `CounterDimension.peerIp` for rate-limit keys keyed on the dnsEvent peer IP.

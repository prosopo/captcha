---
"@prosopo/provider": patch
---

Follow-up to the mobile puzzle sizing. The easier placement target and larger
piece now need a device signal behind them, not just the platform the request
header claims. The difficulty ladder is unchanged.

A mobile-carrier address and a small packet size were also counted as two
separate pieces of evidence when the second mostly follows from the first. They
now count once between them, which stops a laptop tethered to a phone adding up
to a phone.

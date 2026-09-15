---
"@prosopo/captcha-severity": minor
---

Rank `iconOrder` in the shared captcha severity table.

The icon-order type landed while the per-type severity ordering was being extracted out of the provider into this package, so the two changes crossed. Icon-order now has its own tier — `image > iconOrder > puzzle > pow > frictionless` — instead of falling through to 0 and tying with an unset captcha type, which would have put every icon-order Restrict rule and traffic-filter policy below every other type.

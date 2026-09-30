---
"@prosopo/provider": patch
---

Allowed-domain patterns that contain `*` are now matched without a regular expression. A pattern such as `*a*a*a*a*a*a*a*a*a*b` used to take tens of seconds to check against a long hostname, blocking the provider for every other request while it ran. Matching now takes time proportional to the pattern and hostname lengths, with the same results as before.

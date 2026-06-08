---
"@prosopo/cli": patch
---

Caddy now SNI-routes :443 with caddy-l4. Pixel URL drops the :9362 port; HTTP-01 ACME renewals keep working via auto-managed :80.

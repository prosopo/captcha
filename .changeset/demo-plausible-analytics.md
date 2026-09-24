---
"@prosopo/client-bundle-example": patch
---

The public demo at demo.prosopo.io now reports page views to Plausible under the `demo.prosopo.io` site, so we can see who uses it. The tracker only loads on that exact host, so local runs, staging and the Cypress suite send nothing.

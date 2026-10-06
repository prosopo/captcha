---
"@prosopo/client-bundle-example": patch
---

The demo site build now reads its site keys from the committed `env.production` / `env.staging` files whenever no local `.env.<mode>` sets them, and refuses to build if any of the frictionless, PoW, image or puzzle keys is still missing.

From the 29 September deploy until 6 October, every page on demo.prosopo.io shipped `data-sitekey="undefined"`. The build only looked for a `.env.production` file. In the private repo, that search finds the root `.env.production`, which has no demo keys. `env.production` also gains the puzzle key it was missing, and `env.staging` now holds the keys the staging demo is actually deployed with.

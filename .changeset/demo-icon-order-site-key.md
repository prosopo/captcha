---
"@prosopo/client-bundle-example": patch
---

The icon-order demo pages get a production and staging site key, so demo.prosopo.io can serve them. Production and staging demo builds now also refuse to run without `PROSOPO_SITE_KEY_ICONORDER`, like the other four demo keys, so those pages can't ship with `data-sitekey="undefined"`.

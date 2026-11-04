---
"@prosopo/client-bundle-example": patch
"@prosopo/client-example-server": patch
---

demo.prosopo.io gets an icon-order site key slot. Production and staging demo builds now refuse to run without `PROSOPO_SITE_KEY_ICONORDER`, like the other four demo keys, so the icon-order pages can't ship with `data-sitekey="undefined"`. The key itself is still to be filled in.

The demo server also matches a site whose secret ends in `//iconorder`. The portal builds a site's secret from its lowercased name, so a portal site named for icon order gets that lowercase suffix, while the server only tried `//iconOrder`.

---
"@prosopo/api-route": patch
"@prosopo/captcha-severity": patch
"@prosopo/common": patch
"@prosopo/dotenv": patch
"@prosopo/icon-order-assets": patch
"@prosopo/locale": patch
"@prosopo/logger": patch
"@prosopo/redis-client": patch
"@prosopo/types": patch
"@prosopo/util": patch
"@prosopo/util-crypto": patch
---

The Rust ports' equivalence generators now refuse to run on anything but Node 24, the production runtime, and the icon-order-assets vectors are regenerated on it. No behaviour changes.

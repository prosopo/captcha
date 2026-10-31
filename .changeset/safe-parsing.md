---
"@prosopo/client-example-server": patch
"@prosopo/scripts": patch
"@prosopo/api": patch
"@prosopo/audio-assets": patch
"@prosopo/cli": patch
"@prosopo/datasets": patch
"@prosopo/datasets-fs": patch
"@prosopo/ipinfo": patch
"@prosopo/logger": patch
"@prosopo/procaptcha-bundle": patch
"@prosopo/provider": patch
"@prosopo/puzzle-assets": patch
"@prosopo/server": patch
"@prosopo/types": patch
"@prosopo/user-access-policy": patch
"@prosopo/util-crypto": patch
"@prosopo/web-bot-auth": patch
---

Stop malformed input from turning into silent wrong values or unhandled throws. Numbers from env vars, headers, request fields and CLI flags are now parsed strictly: "12abc" is no longer read as 12, and an empty string is no longer read as 0. A bad request timestamp now gets a 400 response instead of a 500 or NaN. JSON reads name the file or source that was bad, and JSON writes no longer throw on bigints. Composite IP addresses and dates that cannot be read are now rejected instead of crashing or slipping through as an Invalid Date.

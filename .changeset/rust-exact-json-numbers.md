---
"@prosopo/api-route": patch
"@prosopo/api": patch
"@prosopo/audio-assets": patch
"@prosopo/common": patch
"@prosopo/datasets": patch
"@prosopo/dotenv": patch
"@prosopo/icon-order-assets": patch
"@prosopo/ipinfo": patch
"@prosopo/keyring": patch
"@prosopo/load-balancer": patch
"@prosopo/locale": patch
"@prosopo/logger": patch
"@prosopo/puzzle-assets": patch
"@prosopo/server": patch
"@prosopo/types": patch
"@prosopo/user-access-policy": patch
"@prosopo/util-crypto": patch
"@prosopo/util": patch
"@prosopo/web-bot-auth": patch
---

Every Rust crate now parses JSON numbers exactly, as `JSON.parse` does. Without serde_json's `float_roundtrip` feature a number could be read as the next double along, so a value parsed, hashed or written back could differ from the TypeScript's in its last bit; a crate built on its own got the inexact parser unless one of its dependencies happened to ask for the exact one.

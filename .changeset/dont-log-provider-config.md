---
"@prosopo/cli": patch
---

Stop logging the provider's whole config at debug level on start. It included database URIs, the Redis password, API keys and account secrets in plain text.

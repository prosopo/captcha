---
"@prosopo/provider": minor
"@prosopo/api": patch
"@prosopo/load-balancer": patch
---

Allow a client to send a captcha verify request to any pronode: a provider that did not issue the token now forwards the verification to the issuing provider (decoded from the token's providerUrl, SSRF-guarded against the known provider list) and returns its response, mirroring the AWS Lambda verify endpoint. Falls back to local verification when this node is the issuer, the provider list can't be loaded, or the issuer can't be determined.

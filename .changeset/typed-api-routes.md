---
"@prosopo/api-route": major
"@prosopo/api-express-router": minor
"@prosopo/user-access-policy": minor
"@prosopo/types": minor
"@prosopo/api": patch
"@prosopo/provider": patch
"@prosopo/provider-mock": patch
"@prosopo/client-example-server": patch
---

Every provider, access rule and demo route now has a contract: one shared object holding its path, method, request schema and response type. Servers register routes through the contract with `registerApiRoute`, and the provider and access rule clients send requests to contract paths, so the two sides can't drift apart. Nothing changes on the wire.

Breaking: `ApiEndpoint` and `ApiEndpointResponse` now need an explicit response data type, and every endpoint names its own instead of falling back to `object`. `@prosopo/api-route/contracts` exports the provider route contracts.

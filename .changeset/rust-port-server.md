---
"@prosopo/server": patch
"@prosopo/types": patch
"@prosopo/api-route": patch
---

Add a Rust port of the server SDK, `prosopo-server`: verifying a procaptcha token with the provider that issued it, for every captcha type, plus reading the server's configuration from the environment. It is checked against the TypeScript end to end. To support it, the Rust types export the procaptcha token encoders and the api-route schema library exports its `Number()` conversion. The TypeScript is unchanged.

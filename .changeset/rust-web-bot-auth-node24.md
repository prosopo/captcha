---
"@prosopo/web-bot-auth": patch
---

Make the Rust port of `normaliseSignatureAgentUrl` match Node 24, the production runtime: lowercasing the host of a URL that has none now gives it an empty host, as the URL standard says. The TypeScript package is unchanged.

---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Port the provider's domain check on client routes to Rust: a request is served only when its site key is registered and its origin matches one of the site's allowed domain patterns, with the same refusals. Checked against the real express app on live MongoDB and against the TypeScript pattern matcher over 750 cases. The TypeScript is unchanged.

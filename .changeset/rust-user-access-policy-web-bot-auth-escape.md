---
"@prosopo/user-access-policy": patch
---

The Rust port of the access-rule reader now escapes the Web Bot Auth signer URL in its Redis query, as the TypeScript does since v3.8.34. Without it a rule keyed on a signer URL such as `https://chatgpt.com` was never found.

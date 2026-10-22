---
"@prosopo/api-route": patch
---

Rust validation errors now list each issue's fields in the order zod writes them, so a 400 body from the Rust provider matches the TypeScript's byte for byte, including issues from string checks where zod puts `message` before `path`. The TypeScript is unchanged.

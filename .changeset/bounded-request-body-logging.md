---
"@prosopo/provider": patch
---

When a captcha challenge, solution or verify request fails to parse, the provider now logs a short summary of the body (its type, size, top-level keys and a preview of at most 512 characters) instead of the whole body. Signature, token, secret, proof, salt, email, password and IP fields are replaced with `[redacted]` in the preview, however deeply they are nested. Before, a caller could post a body close to the 1 MB limit and have all of it copied into the logs, including any tokens and signatures it carried.

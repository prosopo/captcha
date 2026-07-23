---
"@prosopo/provider": patch
---

fix(provider): stop treating apex-TLS-handshake failure as spam-email evidence

`checkSpamEmail` was auto-rejecting any email domain whose apex website failed a modern TLS handshake (`https://<domain>` → `EPROTO` / `unsupported protocol`). This is a property of the web server, not the email domain — small-business domains routinely host mail on modern providers (Zoho / Google / Fastmail) while the apex site runs legacy Apache with only TLSv1.0 and an expired self-signed cert, and modern Node/OpenSSL 3 refuses those handshakes.

The `tlsError → return true` short-circuit is removed. The TLS observation is still logged (as `info`, for signal), and the check now falls through to the remaining DNS signals (redirect-target spam lookup, CNAME spam lookup, MX-target spam lookup) — those are the signals that actually reflect email reputation. Existing coverage on those paths is unchanged; two unit tests cover the new behaviour (apex TLS error alone is not spam; spam via MX is still caught when apex has a TLS error).

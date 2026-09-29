---
"@prosopo/types": patch
"@prosopo/provider": patch
---

Add an optional `padBytes` to traffic-filter category policies, so an operator can tarpit a category (e.g. proxy) instead of hard-blocking it: pair a high `powDifficulty` with `padBytes` and that category's challenge is made expensive in both CPU and bandwidth.

When a request matches a category that carries `padBytes` — `challenge` or `block`, since a blocked category still hands out a deferred challenge at request time — the provider appends that many bytes of incompressible padding to the challenge issuance response. So a category set to `block` still burns the caller's bandwidth on the way to being blocked. The count is resolved from the live traffic-filter verdict at request time — nothing is persisted, and the bytes never come from the client. The padding is streamed pad-first (before the real challenge fields) so a scraper can't read the prefix and abort, and it is bounded at 5 MiB so it can't be turned into an amplifier.

Off by default and fully backward-compatible: with no `padBytes` configured, responses are byte-for-byte unchanged. A single response-wrapping middleware applies the padding, so no challenge endpoint can bypass it.

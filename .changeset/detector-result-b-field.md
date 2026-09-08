---
"@prosopo/types": patch
"@prosopo/provider": patch
---

feat(types,provider): carry the client's `b` signal map on DetectorResult

`DetectorResult` grows an optional `b?: Record<string, string[]>`, and
`getBotScore` forwards it, following the same shape as the existing `g`, `i`,
`sw`, `md`, `bn` and `fs` fields: read off the decoded payload, passed through
untouched, absent for clients that predate it.

Typing it is the whole change. Without it the field arrives on the provider
untyped and any rule reading it has to assert its shape at the call site.

The map is keyed by signal name with a short list of strings per key. It is
empty for the great majority of sessions, so anything consuming it should
treat absent and empty as the same thing. Adding a key is a client-side
change and needs no deploy here — an existing decoder passes through keys it
predates rather than dropping the ones it knows, which is the property that
lets the two sides move independently.

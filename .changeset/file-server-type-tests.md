---
"@prosopo/file-server": patch
---

test(file-server): add vitest type tests for the server API

The most important of these guards `FetchFn`: express exports its own
`Response` type, and an unqualified import silently retargets the alias at it,
producing errors far away at the call sites. The test pins the return as
`Promise<globalThis.Response>`. Also pinned: `toInt` returning
`number | undefined` rather than `number` (NaN is a number, so a plain `number`
return would hide the unparseable case), `FileServerEnv.resize` modelling
absence as `undefined` rather than zero, and `main` resolving to the
`http.Server` so callers can shut it down.

---
"@prosopo/http-blackhole": patch
---

test(http-blackhole): add vitest type tests for the server API

Pins the injection seams that make this package testable: `Exit` returning
`void` rather than `never` (the `never` of `process.exit` would make every line
after an exit call unreachable to the compiler, which is wrong for the
recording double the tests inject), `Logger.log` taking a single pre-formatted
string, `resolvePort` accepting `string | undefined` so callers need not narrow
`process.env.PORT` first, and `createShutdown` returning a zero-argument
handler that `process.on` accepts directly.

---
"@prosopo/ipinfo": minor
"@prosopo/types": minor
---

Add unit and type tests for `@prosopo/ipinfo`, with the injection seams needed to write them.

- `IpapiBackend` accepts an injected `fetch` and a configurable `timeoutMs`; `MaxMindBackend` accepts an injected `openReader`; `IpInfoService` accepts injected backends.
- `parseAbuserScore` no longer throws when the upstream omits `abuser_score`. The field is declared required by the response type but is not validated on the wire, and a missing value used to turn an otherwise successful lookup into a generic "Network or parsing error".
- `IPInfoResult.isValid` is now the literal `true` rather than `boolean`, making `IPInfoResponse` an actually discriminated union. Previously `if (!res.isValid)` narrowed to nothing, so `res.error` did not compile and consumers had to cast.
- The backends, their config types and the injection seams are re-exported from the package entrypoint, along with `isNonRoutable`.

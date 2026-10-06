---
"@prosopo/provider": patch
---

Add a robustness fuzzer for the provider's client and verify API at `packages/provider/src/tests/fuzz/apiFuzz.ts`. Point it at a disposable provider and it sends every endpoint malformed bodies: wrong types, numeric extremes, NUL and lone-surrogate strings, prototype keys, Mongo operators, 4000-deep nesting and arrays that fill the 1MB body limit. It then replays the heaviest of those in concurrent bursts. While it runs it times `/healthz` to catch event-loop stalls and samples the provider's memory to spot steady growth. It exits non-zero if any request gets a 5xx or no response.

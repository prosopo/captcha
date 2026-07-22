---
"@prosopo/cli": patch
---

test(cli): unit-test coverage for `RateLimiter.getRateLimitConfig` and `commands/validators`

Adds two new vitest files under `@prosopo/cli/src/tests/`:

- `RateLimiter.unit.test.ts` — 7 tests covering `getRateLimitConfig`:
  every ClientApiPaths / AdminApiPaths / PublicApiPaths route referenced in
  the source has a mapped entry (regression guard against silently dropping
  routes on refactor); env vars are propagated verbatim to `windowMs` /
  `limit`; no WINDOW/LIMIT crossover; and the config is re-read on every
  invocation rather than cached at module load (so ops can hot-toggle a
  rate window without restarting the provider). Snapshots and restores
  every `PROSOPO_*` env var it touches so the suite doesn't leak state.

- `commands/validators.unit.test.ts` — 14 tests covering the four
  argv validators: `validateAddress`, `validateSiteKey`, `validateValue`,
  `validateScheduleExpression`. Verifies SS58 ↔ hex address round-tripping
  through `encodeStringAddress`; `ProsopoContractError` with
  `CONTRACT.INVALID_ADDRESS` on garbage address input;
  `ProsopoEnvError` with `CLI.PARAMETER_ERROR` for non-numeric values
  (string, boolean, object, null, undefined); and cron parsing across a
  spread of standard schedule expressions.

No behaviour change — pure test additions. Fills a coverage gap in a
package that previously had a single integration-style bundle test and
no unit tests for these pure helpers.

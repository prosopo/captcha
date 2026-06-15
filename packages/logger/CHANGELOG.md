# @prosopo/logger

## 1.0.3
### Patch Changes

- Updated dependencies [55b1388]
  - @prosopo/util@3.3.0

## 1.0.2
### Patch Changes

- 97cf7bd: Fix log level numeric ordering to use conventional ascending severity (trace=0, fatal=5) matching Winston, Pino, and Log4j. Also fixes the emitted level field which was recording the threshold instead of the message level.
- 6ca1125: Move stringifyBigInts to @prosopo/util where generic utilities belong. Re-exported from @prosopo/logger for backward compatibility.
- 32a591b: Replace hardcoded field allowlist in unpackError with Object.getOwnPropertyNames so all custom subclass fields are captured automatically. Fixes duplicate cause assignment and updates errData type.
- Updated dependencies [6ca1125]
  - @prosopo/util@3.2.15

## 1.0.1
### Patch Changes

- 0fd81af: Extract the logger into its own `@prosopo/logger` package, out of `@prosopo/common`. Consumers now import logger symbols from `@prosopo/logger`; `@prosopo/common` no longer re-exports them. Unused `@prosopo/common` dependencies pruned where the only usage was the logger.

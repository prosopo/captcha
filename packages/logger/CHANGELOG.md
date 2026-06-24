# @prosopo/logger

## 2.0.0
### Major Changes

- 41e0e11: Tighten @prosopo/logger public exports: drop the stringifyBigInts re-export (import it from @prosopo/util instead) and stop exporting internal-only symbols (level/format string constants and LevelMap).

### Minor Changes

- 948d36b: Add directive-based scope filtering via PROSOPO_LOG_LEVEL and subscope support to with(). PROSOPO_LOG_LEVEL now accepts comma-separated directives like "warn,database=trace" to set per-scope log levels. Directives are resolved at print time, so child loggers created via with() pick up directive changes made after construction (e.g. via setGlobalDirectives) instead of having the level resolved at with() time baked in.

### Patch Changes

- 7ebb78f: chore(deps-dev): bump vite from 6.4.1 to 6.4.3 in /packages/logger
- 3c80664: Trim whitespace from subscopes in Logger.with so they match directive keys, and clarify the with() JSDoc to describe the snapshot-at-creation level plus emit-time directive re-resolution.
- Updated dependencies [849af99]
- Updated dependencies [a5ba27b]
  - @prosopo/util@3.3.2

## 1.0.4
### Patch Changes

- Updated dependencies [edcd450]
  - @prosopo/util@3.3.1

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

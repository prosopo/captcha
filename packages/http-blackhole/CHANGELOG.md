# @prosopo/http-blackhole

## 1.1.0
### Minor Changes

- 346ab23: fix(http-blackhole): make the per-socket request log unsubstitutable
  
  `handleRequest` took the request log as a `WeakMap` parameter, which does not
  actually constrain anything: `Map` is structurally assignable to `WeakMap`
  (both satisfy get/set/has/delete, and neither narrows `Symbol.toStringTag` to a
  literal), so a caller passing a strongly-keyed `Map` compiled cleanly and would
  have retained every socket the process ever served — on a server that holds
  every connection open by design.
  
  The seam is now a `RecordRequest` callback, which admits no such substitution,
  and the map itself is built by `createRequestLog` — a single construction site
  the tests assert against directly, by registering a socket, dropping the only
  strong reference and forcing collection with `--expose-gc`. Weakness is a
  property of the class rather than of the type, so observing it is the only way
  to prove it.
  
  `handleRequest`'s third parameter changes type, which is breaking for anyone
  calling it directly — hence a minor rather than a patch on this 0.x/1.x package.
  
  Also covers `src/index.ts`, which was previously untested: it starts listening,
  registers both SIGINT and SIGTERM, exits zero on a clean shutdown, and ignores
  a repeat signal.

### Patch Changes

- 42f5aa8: Fix shutdown hanging on held-open connections, validate PORT strictly instead
  of silently defaulting, surface close() failures as a non-zero exit, ignore
  repeat shutdown signals, and log connections that never send a request.
- 346ab23: test(http-blackhole): add vitest type tests for the server API
  
  Pins the injection seams that make this package testable: `Exit` returning
  `void` rather than `never` (the `never` of `process.exit` would make every line
  after an exit call unreachable to the compiler, which is wrong for the
  recording double the tests inject), `Logger.log` taking a single pre-formatted
  string, `resolvePort` accepting `string | undefined` so callers need not narrow
  `process.env.PORT` first, and `createShutdown` returning a zero-argument
  handler that `process.on` accepts directly.
- 42f5aa8: Extract the server, request handler, port resolution and shutdown handler into
  injectable units and add unit tests covering them.

## 1.0.26
### Patch Changes

- 0a38892: feat/cross-os-testing
- a8faa9a: bump license year
- 3acc333: Release 3.3.0

## 1.0.25
### Patch Changes

- 7d5eb3f: bump

## 1.0.24
### Patch Changes

- 93d92a7: little bump for publish all

## 1.0.23
### Patch Changes

- 8ee8434: bump node engines to 24 and npm version to 11
- cfee479: make @prosopo/config a dev dep

## 1.0.22
### Patch Changes

- e926831: mega mini bump for all to trigger publish all
- Updated dependencies [e926831]
  - @prosopo/config@3.1.23

## 1.0.21
### Patch Changes

- 8ce9205: Change engine requirements
- b6e98b2: Run npm audit
- Updated dependencies [8ce9205]
- Updated dependencies [df79c03]
- Updated dependencies [b6e98b2]
  - @prosopo/config@3.1.22

## 1.0.20
### Patch Changes

- Updated dependencies [b8185a4]
  - @prosopo/config@3.1.21

## 1.0.19
### Patch Changes

- Updated dependencies [1e3a838]
  - @prosopo/config@3.1.20

## 1.0.18
### Patch Changes

- 5659b24: Release 3.4.4
- Updated dependencies [5659b24]
  - @prosopo/config@3.1.19

## 1.0.17
### Patch Changes

- 50c4120: Release 3.4.3
- Updated dependencies [50c4120]
  - @prosopo/config@3.1.18

## 1.0.16
### Patch Changes

- 618703f: Release 3.4.2
- Updated dependencies [618703f]
  - @prosopo/config@3.1.17

## 1.0.15
### Patch Changes

- 11303d9: Release 3.4.0
- 18cb28b: Release 3.4.1
- Updated dependencies [11303d9]
- Updated dependencies [18cb28b]
  - @prosopo/config@3.1.16

## 1.0.14
### Patch Changes

- f3f7aec: Release 3.4.0
- Updated dependencies [f3f7aec]
  - @prosopo/config@3.1.15

## 1.0.13
### Patch Changes

- Release 3.3.1
- 0824221: Release 3.2.4
- Updated dependencies
- Updated dependencies [0824221]
  - @prosopo/config@3.1.14

## 1.0.12
### Patch Changes

- 008d112: Release 3.3.0
- Updated dependencies [008d112]
  - @prosopo/config@3.1.13

## 1.0.11
### Patch Changes

- 0824221: Release 3.2.4
- Updated dependencies [0824221]
  - @prosopo/config@3.1.12

## 1.0.10
### Patch Changes

- 1a23649: Release 3.2.3
- Updated dependencies [1a23649]
  - @prosopo/config@3.1.11

## 1.0.9
### Patch Changes

- 657a827: Release 3.2.2
- Updated dependencies [657a827]
  - @prosopo/config@3.1.10

## 1.0.8
### Patch Changes

- 7bdaca6: Release 3.2.1
- Updated dependencies [4440947]
- Updated dependencies [7bdaca6]
- Updated dependencies [809b984]
- Updated dependencies [809b984]
  - @prosopo/config@3.1.9

## 1.0.7
### Patch Changes

- 6fe8570: Release 3.2.0
- Updated dependencies [6fe8570]
  - @prosopo/config@3.1.8

## 1.0.6
### Patch Changes

- f304be9: Release 3.1.13
- Updated dependencies [f304be9]
  - @prosopo/config@3.1.7

## 1.0.5
### Patch Changes

- Updated dependencies [9eed772]
  - @prosopo/config@3.1.6

## 1.0.4
### Patch Changes

- 6960643: lint detect missing and unneccessary imports

## 1.0.3
### Patch Changes

- Updated dependencies [30e7d4d]
  - @prosopo/config@3.1.5

## 1.0.2
### Patch Changes

- Updated dependencies [44ffda2]
- Updated dependencies [a49b538]
  - @prosopo/config@3.1.4

## 1.0.1
### Patch Changes

- 0201d1c: use vite for build/bundle
- 5dabccb: add @prosopo prefix to http-blackhole pkg name
- Updated dependencies [828066d]
- Updated dependencies [91bbe87]
- Updated dependencies [3ef4fd2]
- Updated dependencies [91bbe87]
- Updated dependencies [346e092]
- Updated dependencies [5d36e05]
  - @prosopo/config@3.1.3

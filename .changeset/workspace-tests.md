---
"@prosopo/workspace": minor
"@prosopo/config": patch
---

test(workspace): unit + type tests, fix root-path encoding, stale getters and coverage for non-`packages/` workspaces

- `getRootDir` used `new URL(...).pathname`, which is percent-encoded — a
  checkout under a path containing a space or a `#` produced `%20`/`%23` and
  every derived path failed to resolve. Now uses `fileURLToPath`.
- `getClientExampleDir` and `getDappExampleDir` returned paths for
  `demos/client-example` and `demos/dapp-example`, neither of which exists any
  more. Both were unused; removed.
- `findWorkspaceRoot` takes an optional injected dependency set so the search
  can be tested against a synthetic tree, and no longer parses package.json
  into an implicitly-`any` value.
- `ViteTestConfig` decided whether it was running inside a package by looking
  for `/packages/` in the cwd, so workspaces under `dev/`, `demos/` and
  `integration/` fell through to the repo-root globs and reported 0/0 coverage
  regardless of what their tests covered.

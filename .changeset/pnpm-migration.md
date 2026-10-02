---
"@prosopo/config": patch
"@prosopo/workspace": patch
"@prosopo/util": patch
---

Move the repo from npm to pnpm 11.

- `pnpm-workspace.yaml` replaces the `workspaces` field and `.npmrc`, and `pnpm-lock.yaml` replaces `package-lock.json` (converted with `pnpm import`, so versions are unchanged).
- Internal `@prosopo/*` dependencies use `workspace:*`. `pnpm publish` (which `changeset publish` now runs) swaps each for the exact version, so published manifests are the same as before. Member packages no longer declare an npm engine.
- `@prosopo/config`'s `getDependencies` walks the installed `node_modules` tree instead of parsing `npm ls`, so bundle externals are computed the same way under any package manager.
- `@prosopo/workspace` exports `getWorkspacePatterns`, which builds glob patterns from the workspace's `pnpm-workspace.yaml` (keeping its exclusions); the lint commands use it instead of `package.json`'s `workspaces`.
- `verifyDepsBeforeRun` is off, because inside captcha-private a script run here would otherwise install captcha standalone over the parent's `node_modules`.
- Packages that relied on npm hoisting for types or tools now declare them.
- `@prosopo/util` declares the `url` package. `isMain` imports `url`, which Node serves from its built-in module and browser bundlers resolve to this package; npm used to provide it by hoisting.

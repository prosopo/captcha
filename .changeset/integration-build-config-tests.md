---
"@prosopo/procaptcha-integration-build-config": patch
---

Add unit and type tests for the integration vite config builder, and fix the
defects they found:

- The library file name ignored the format it was given and always returned
  `index.js`, so a package that asked for a second format wrote both builds over
  the same file. Non-`es` formats are now named after the format.
- `deepmerge` cloned the caller's vite plugins, detaching each copy from the state
  it closed over. Merging no longer clones.
- An empty `directory` silently resolved every path against the process working
  directory, and an empty `name` produced an unnamed library; both are now
  rejected.
- `IntegrationConfigSettings` is exported, so a consumer's `vite.config.ts` can
  type its own settings.

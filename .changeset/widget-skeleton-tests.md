---
"@prosopo/widget-skeleton": patch
---

Add unit and type tests for the widget skeleton, and harden the two places a
silent failure was possible:

- The checkbox and logo placeholders were swapped in with an optional chain, so
  renaming a class in the markup produced a widget missing one of them with no
  error at all. `replacePlaceholder` now throws.
- The build mode was read straight from `process.env` / `import.meta.env`.
  Neither exists everywhere the widget runs, so reading it is now isolated
  behind `readEnvironmentSources`, an unset `NODE_ENV` falls back to the
  bundler's mode rather than defaulting to development, and a bundler shim that
  fails to resolve no longer stops the widget rendering.

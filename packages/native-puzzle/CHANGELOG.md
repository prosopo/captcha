# @prosopo/native-puzzle

## 0.1.5
### Patch Changes

- f9c3fc3: The Rust addons now build in debug mode unless `NODE_ENV=production`, so local builds and CI tests stop paying for full link-time optimisation. Production builds (npm publish, the provider image) still run `build:release` with full LTO. Dependencies are optimised even in debug so tests stay fast, and the CI `cargo test` job now runs in debug with a cargo cache instead of a cold release build.
- 2086040: Each kind of build now writes to its own folder under dist: dist/esm (vite ESM), dist/cjs (vite CommonJS), dist/types (declarations), dist/tsc (plain tsc), dist/bundle and dist/bundle-webpack (bundles) and dist/native (the Rust addons). Turbo caches each folder separately, so building one variant no longer overwrites or invalidates another. Package exports point at the new folders; anything importing a file from dist by path has to add the variant folder.
  
  The Rust addons are no longer committed. They are built into dist/native, in debug for development and tests and fully optimised when NODE_ENV=production, so building them now needs a Rust toolchain.
  
  Code that found the repo root or its certificates by climbing a fixed number of folders up from its own file now starts from its package's folder instead (new `packageDir` in @prosopo/util/node). The fixed count stopped working once the build output moved one folder deeper.

## 0.1.4
### Patch Changes

- 937f441: `generateBackground` and `generateBackgroundSeparable` now reject a width or height above 4096 with an `InvalidArg` error. Before, a very large size tried to allocate the whole image and could use up memory. At `u32::MAX` it overflowed the size calculation and panicked, and that panic aborted the whole Node process. Any other panic now surfaces as a JS error instead of an abort. Normal puzzle output is byte-for-byte unchanged.

## 0.1.3
### Patch Changes

- 46b97b7: Roll up the open Dependabot updates: express 5 (with `@types/express` 5), dotenv 18, undici 8, geolib 4, vitest 5, vite 8.1.6 everywhere, 17 minor and patch bumps (Babel, mongoose, i18next, ip-address, turbo and others), `@angular/router` in the Angular demo, and a GitHub Actions bump.
  
  The whole vitest family moves to 5.0.4, including `@vitest/coverage-v8`, because `@vitest/browser-playwright` 5 only works with vitest 5. The `@types/express-serve-static-core` override moves to 5.1.3 to match `@types/express` 5.
  
  `@prosopo/dotenv` now loads env files with `quiet: true`. Since dotenv 17, every load prints an "injected env" line to stderr unless told not to.

## 0.1.2
### Patch Changes

- 24e89e1: The provider's Rust puzzle background generator now applies the same colour-blindness contrast check as the JS reference: when a palette is too flat for colour-blind users, it redraws it with a wider lightness range. It used to skip this, so about 1 in 60 backgrounds came out differently from the JS version. Those puzzles couldn't be replayed in the portal, and they missed the contrast floor. It's also why the puzzleRenderer replay test failed now and then.

## 0.1.1
### Patch Changes

- 1f36456: Roll up the open Dependabot updates: 25 minor and patch bumps, sharp 0.35.5, pbkdf2 3.1.7, smoldot 3.6.0, and two GitHub Actions bumps.
  
  Babel moves to 8. Its plugins and babel-loader move with it, because Babel 8 refuses to load v7 plugins. The import-attributes syntax plugin is gone: Babel 8 parses `with { type: "json" }` by default. The unused `@rollup/plugin-babel` is removed.
  
  `@polkadot/types` and `@polkadot/types-codec` move to 17.0.2. Without that, `@polkadot/extension-*` 0.64 pulls in a second copy of the types and the widget packages stop typechecking.

## 0.1.0
### Minor Changes

- 6d9711f: Measure where the provider's CPU actually goes, and move puzzle background generation to Rust.
  
  **Measuring first.** We have been choosing what to optimise by reading the code and guessing, and the guesses have been wrong in both directions — a decoder shipped nine times slower than its predecessor without anyone noticing, and a background generator we assumed would be ten to twenty times faster in Rust turned out to be three. Two things now answer the question with numbers instead.
  
  `measureSync` wraps a named block of synchronous work and records the CPU it burns, so `prosopo_sync_span_cpu_seconds_total` gives a per-day ranking of which blocks cost the most. Seven blocks are instrumented: the three payload decoders, puzzle background generation and rendering, the merkle build, and decision machine execution. The measurement is only honest for work that holds the event loop, which is why the helper takes a plain function and not an async one — billing a function for the requests served during its awaits would produce a confident wrong answer.
  
  A periodic CPU profiler covers what nobody thought to instrument. It samples the isolate for a few seconds, logs the busiest call frames by self time, and sleeps. It is off unless `PROSOPO_CPU_PROFILE_ENABLED=true`, samples a short window every fifteen minutes by default, and cannot take the provider down with it if it fails.
  
  Event loop lag and process CPU were already being collected by the default Prometheus metrics; nothing was added there.
  
  **Puzzle backgrounds in Rust.** The new `@prosopo/native-puzzle` package generates the mesh-gradient background the slider puzzle sits on. It produces byte-identical output to the JavaScript for the same seed — verified against the existing implementation, which stays in place as the reference — and takes about a third of the time, so a buffer refill now stalls the event loop for around eleven milliseconds instead of thirty-two. The JavaScript remains the browser-side implementation and the thing the differential test compares against.

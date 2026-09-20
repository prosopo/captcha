# @prosopo/native-puzzle

## 0.1.0
### Minor Changes

- 6d9711f: Measure where the provider's CPU actually goes, and move puzzle background generation to Rust.
  
  **Measuring first.** We have been choosing what to optimise by reading the code and guessing, and the guesses have been wrong in both directions — a decoder shipped nine times slower than its predecessor without anyone noticing, and a background generator we assumed would be ten to twenty times faster in Rust turned out to be three. Two things now answer the question with numbers instead.
  
  `measureSync` wraps a named block of synchronous work and records the CPU it burns, so `prosopo_sync_span_cpu_seconds_total` gives a per-day ranking of which blocks cost the most. Seven blocks are instrumented: the three payload decoders, puzzle background generation and rendering, the merkle build, and decision machine execution. The measurement is only honest for work that holds the event loop, which is why the helper takes a plain function and not an async one — billing a function for the requests served during its awaits would produce a confident wrong answer.
  
  A periodic CPU profiler covers what nobody thought to instrument. It samples the isolate for a few seconds, logs the busiest call frames by self time, and sleeps. It is off unless `PROSOPO_CPU_PROFILE_ENABLED=true`, samples a short window every fifteen minutes by default, and cannot take the provider down with it if it fails.
  
  Event loop lag and process CPU were already being collected by the default Prometheus metrics; nothing was added there.
  
  **Puzzle backgrounds in Rust.** The new `@prosopo/native-puzzle` package generates the mesh-gradient background the slider puzzle sits on. It produces byte-identical output to the JavaScript for the same seed — verified against the existing implementation, which stays in place as the reference — and takes about a third of the time, so a buffer refill now stalls the event loop for around eleven milliseconds instead of thirty-two. The JavaScript remains the browser-side implementation and the thing the differential test compares against.

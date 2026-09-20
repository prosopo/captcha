---
"@prosopo/provider": minor
"@prosopo/config": minor
"@prosopo/cli": patch
---

Decode detector payloads on worker threads instead of on the request path, and fix the CPU metric that was measuring the wrong thing.

**The measurement was wrong.** `prosopo_sync_span_cpu_seconds_total` claimed to report the CPU a block of synchronous work costs, on the reasoning that nothing else can run while it holds the event loop. That is true of the main thread but not of the process: `process.cpuUsage()` counts every thread, so V8's background garbage collector and compiler and the image encoder's thread pool were all billed to whichever block happened to be open. In production it reported *more* CPU than wall-clock time, which is impossible for work on one thread, and that is what gave it away. Node offers no per-thread CPU clock, so the counter is removed rather than corrected — process-wide CPU is already reported as `prosopo_process_cpu_seconds_total`. The wall-time counter was never affected and is the one to rank by: for a synchronous block it is exactly the delay imposed on everything else waiting.

**What that measurement found.** The three detector decoders held the event loop for 15–47 ms every time they ran, and together accounted for about 84% of all the blocking we measured. That cost does not stay with the request doing the decoding — it delays every other request being served at that moment, health checks included. It is the same shape of problem as the decoder that shipped nine times slower in 3.8.14.

**The fix.** The decoders now run on a small pool of worker threads. The decoders themselves are untouched: the same file, the same input, the same output, including the same failures — the tests check that decoding through the pool is indistinguishable from decoding inline. A round trip to a worker costs between 0.01 and 0.2 ms against the 15–47 ms it takes off the request path.

Set `PROSOPO_DECODER_WORKERS=0` to go back to decoding inline; it takes a restart but not a rollback. `PROSOPO_DECODER_WORKERS` sets the pool size (default: up to four, leaving a core spare) and `PROSOPO_DECODER_TIMEOUT_MS` caps how long one decode may take before the worker is replaced. If workers cannot be started at all the provider decodes inline and says so in the log, because serving slowly is better than not serving.

Two new metrics replace the decoder spans: `prosopo_decoder_duration_seconds` and `prosopo_decoder_calls_total`. Watch them next to `prosopo_nodejs_eventloop_lag_p99_seconds` — that pair is how you confirm the work moved rather than disappeared.

The decoders are now copied next to the bundle under fixed names and loaded by path, because a worker cannot ask the bundler what it called a chunk. `copyAssetsPlugin` does the copying.

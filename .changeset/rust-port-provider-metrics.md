---
"@prosopo/provider": patch
---

Port the provider's Prometheus metrics to Rust: the `/metrics` endpoint with its access rules, the request counter, and every recording helper, written exactly as prom-client writes them. The Node-specific default metrics (event loop, heap, garbage collection) have no Rust equivalent and are not written; the process CPU, memory and file-descriptor metrics are, under the same names. The TypeScript is unchanged.

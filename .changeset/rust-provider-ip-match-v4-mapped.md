---
"@prosopo/provider": patch
---

The Rust port of the authenticated verify route now treats an IPv4 client reported as `::ffff:a.b.c.d` and the same client sent as `a.b.c.d` as one address, as the TypeScript does since v3.8.34. Before, a Web Bot Auth session issued over a dual-stack socket failed its IP check on the Rust side.

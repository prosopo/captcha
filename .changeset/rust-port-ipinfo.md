---
"@prosopo/ipinfo": patch
"@prosopo/types": patch
---

Add a Rust port of the IP information service: the MaxMind and ipapi.is backends, the service that picks between them, and the non-routable address check. The result types it returns are added to the Rust port of the shared types. The TypeScript is unchanged.

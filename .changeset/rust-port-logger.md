---
"@prosopo/logger": patch
---

Add a Rust port of the logger, for the upcoming Rust provider service. It writes the same JSON log lines as the TypeScript logger, byte for byte, and checks this against recorded TypeScript output. The TypeScript package is unchanged.

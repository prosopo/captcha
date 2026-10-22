---
"@prosopo/provider": patch
"@prosopo/cli": patch
---

Port the provider's scheduled jobs to Rust: sending records to the central database, pulling the client list and refreshing the spam email domain lists. The Rust binary runs them only when started with `--sole`, so they never run twice while the Node provider is still up. Checked against the TypeScript jobs on live MongoDB. The TypeScript is unchanged.

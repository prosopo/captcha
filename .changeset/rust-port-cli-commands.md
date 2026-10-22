---
"@prosopo/cli": patch
"@prosopo/provider": patch
---

Port the provider CLI's commands to the Rust binary: registering site keys (directly or through a provider's admin API), loading a dataset, the abuser score migration, building indexes, sending records to the central database, refreshing the spam email domain lists and printing the version. Checked against the TypeScript commands on a live MongoDB, comparing what each one stores and sends. The TypeScript is unchanged.

---
"@prosopo/database": patch
"@prosopo/provider": patch
"@prosopo/logger": patch
---

The Rust conversions between an IP address and the two halves the records store now live in the database crate, next to the record type, with the provider re-exporting them; the Rust logger exports its JavaScript `trim`. Both so that database-private's Rust can use them without depending on the provider. The TypeScript is unchanged.

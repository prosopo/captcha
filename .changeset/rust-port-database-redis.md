---
"@prosopo/database": patch
"@prosopo/types-database": patch
"@prosopo/redis-client": patch
"@prosopo/logger": patch
---

Finish the Rust port of the database package: the client database's read of updated sites, the Redis session cache (writing exactly the text the TypeScript writes, so both can share a Redis), and the provider's Redis set-up. The Rust types-database now casts a query on a field inside a document array as mongoose does. The Rust redis-client can wrap a client that is already connected, and the Rust logger exports its ISO date formatting. The TypeScript is unchanged.

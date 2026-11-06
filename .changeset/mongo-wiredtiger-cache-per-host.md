---
---

Let each node size mongod's WiredTiger cache and container ceiling instead of hardcoding one figure for the whole fleet.

Every provider node ran `--wiredTigerCacheSizeGB 2.0` inside a 3 GB container, chosen when the nodes were uniform. They are not uniform now: node RAM spans 15-47 GB, and because retention is a 28-day TTL rather than a size cap, retained data varies several-fold between nodes.

On the busiest node the cache sat exactly at WiredTiger's eviction threshold, so it evicted continuously to stay there and nothing could consolidate as resident — 9.4 million pages had been read back off disk. Raising the cache stopped eviction outright and cut sustained disk page reads from about 15/s to 5/s, on a host that had 32 of its 48 GB sitting unused.

Both values now come from `MONGO_WT_CACHE_GB` and `MONGO_MEMORY_LIMIT`, defaulting to the 2.0 and 3G every node ran before, so a host that sets neither is byte-for-byte unchanged.

Scope worth being explicit about: this is storage-layer hygiene, not a latency fix. It was investigated as the cause of elevated request latency on one node and that turned out to be wrong — a peer node holds more data in the same 2 GB cache and serves more traffic faster, and raising the cache did not improve response times. The provider process, not the database, is the bottleneck there.

---
---

Let each node size mongod's WiredTiger cache and container ceiling instead of hardcoding one figure for the whole fleet.

Every provider node ran `--wiredTigerCacheSizeGB 2.0` inside a 3 GB container. That was fine when the nodes were uniform and the data was small. They are not uniform any more: node RAM spans 15-47 GB, and retained captcha data spans roughly 1-25 GB, because retention is time-based (a 28-day TTL) rather than size-based, so the busiest node accumulates the most.

On the busiest node that gap had become severe. Its database had grown to 20 GB with 2 GB of indexes — meaning the indexes alone exactly filled the cache, so nothing stayed resident. WiredTiger evicted continuously, 9.4 million pages had been read back in, and ordinary single-document lookups by indexed field were taking 100-400 ms because the pages came off disk every time. An index-only scan of one 236k-document collection took 125 seconds cold and 2 seconds once resident. Request latency at the edge was a p50 of 134 ms and a p95 of 711 ms, against 72/397 ms on a comparable node carrying a fifth of the traffic. Meanwhile 32 of the host's 48 GB sat unused.

Both values now come from `MONGO_WT_CACHE_GB` and `MONGO_MEMORY_LIMIT`, defaulting to the 2.0 and 3G that every node ran before. A host that sets neither is byte-for-byte unchanged, so this is inert until an inventory gives a node larger numbers.

Sizing each node stays an inventory decision, as it does for the ipinfo sidecar.

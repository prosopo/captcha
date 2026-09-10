---
"@prosopo/client-example-server": patch
---

Stop the staging database being killed by the host, and let it come back on its own.

The `database1` mongo container had no memory limit and no restart policy. The
staging host has 5.8GB of RAM and no swap, so mongod grew until the kernel
OOM-killer took it — three times, on 18 August, 5 September and 8 September.
Because it was the only service in this compose file without
`restart: unless-stopped`, nothing brought it back, and the last crash left the
database down for two days.

It now has `mem_limit: 3g`, which keeps it clear of the host limit, and a
WiredTiger cache pinned to 1.5GB so the rest of the budget is left for
connections and sorts rather than being handed to the cache. `restart:
unless-stopped` matches the other two services, so a crash costs seconds
instead of days.

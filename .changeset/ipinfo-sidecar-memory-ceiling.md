---
---

Give the ipinfo sidecar a memory ceiling so it can't take a whole node down with it.

The sidecar loads a 4 GB IP database and settles at 7.4-8.4 GB resident. It had no limit in the compose manifest, so overshooting meant a *global* out-of-memory event and the kernel chose the victim — which could be mongod or a provider rather than the sidecar that caused it.

That is not hypothetical. On a 11.7 GB node the sidecar could never fit alongside mongod and two providers, so it was killed and restarted over two thousand times in about 21 hours, each restart re-reading the 4 GB database and evicting the page cache the rest of the stack depended on.

A 10 GB ceiling sits above the 8.4 GB high-water mark measured across six nodes, so hosts with the headroom are unaffected. On a host without it, the kill is now confined to the sidecar's cgroup, and the providers handle its absence already by falling back to MaxMind for geolocation and ASN.

This limits the blast radius; it does not make the sidecar fit on a small node. Sizing that node stays an inventory decision.

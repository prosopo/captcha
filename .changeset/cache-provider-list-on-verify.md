---
"@prosopo/load-balancer": patch
"@prosopo/server": patch
---

Stop re-downloading the provider list on every server-side verification.

`ProsopoServer.isVerified` only needs the list to find the one provider that minted the token, but it called `loadBalancer` directly, which fetches the list fresh every time. The package already had a cached `getProviders`, and the verify path was the one caller not using it.

That fetch was measured at 201 ms (p50, and flat — 216 ms at p90) inside the production `siteverify` lambda, on a total invocation of 376 ms. It is a 5.6 KB file listing eight providers that changes when the fleet does, and it was being downloaded roughly 360,000 times a day.

`getProviders` is now keyed by environment *and* ipMode — the `ipv4`/`ipv6` sections of the list carry different urls to the dual-stack default, so they can't share a cache entry — and it ages entries out after five minutes, matching the `cache-control: max-age=300` the list is served with.

A new `findProvider` does the lookup. On a miss it reloads the list once before giving up, so a pronode added part-way through the TTL still verifies the tokens it has already minted. That reload is rate-limited to once every ten seconds, because `providerUrl` is read from the token and an unknown url is a miss too — without the floor, a caller could put the fetch back on every request.

---
"@prosopo/provider": patch
"@prosopo/load-balancer": patch
---

A provider verifying a token it issued itself no longer fetches the provider list first. That fetch was only needed to decide whether to forward the request elsewhere, and when the list endpoint was slow every such verify waited for the full fetch timeout.

Once the provider list has loaded, callers no longer wait on it again. An expired list is refreshed in the background while the previous one keeps being served, and a failed refresh keeps serving the previous list and tries again 30 seconds later, instead of discarding it so the next caller has to fetch from scratch.

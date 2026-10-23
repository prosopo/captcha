---
---

The provider's Caddy now spreads requests across both provider containers (`lb_policy least_conn`) instead of sending everything to provider1 and only using provider2 when provider1 fails. Under a traffic spike, provider1's single Node event loop maxed out and verify calls queued past the 10s timeout, while provider2 and most of the host's CPU sat idle.

Admin paths (`/v1/prosopo/provider/admin/*`) can name a container with an `X-Prosopo-Upstream: provider1|provider2` header. The detector-pool push only updates the container that receives it, and both containers now need the same pool, so the push script uses this to update each one in turn. Client paths ignore the header.

The upstream transport and `header_up` settings move into a `(provider_upstream)` snippet shared by all three `reverse_proxy` blocks. The headers sent to the provider are unchanged.

---
---

The provider's Caddy now answers Baidu's crawler (by user agent or its published address range) with an immediate 403 on client API paths. The provider already blocked it, but some of its requests never send their body, so each one waited out the 15s body timeout first and dragged up the node's average response time.

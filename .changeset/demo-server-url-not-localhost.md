---
"@prosopo/client-bundle-example": patch
---

The production and staging demo sites now send their form to `https://client-example-server.prosopo.io` instead of `https://localhost:9228`. Since the 6 October redeploy, every demo submit failed with "Failed to fetch", and Chrome asked visitors for permission to reach devices on their local network. A production or staging build of the demos now fails if `PROSOPO_SERVER_URL` is missing or points at localhost.

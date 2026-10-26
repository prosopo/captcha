---
---

Default the reputation image to 0.3.1. 0.3.0 has neither --validate nor --healthcheck, and the compose healthcheck calls one of them, so a deploy that did not set REPUTATION_VERSION would have started an image that could never report healthy.

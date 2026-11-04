---
"@prosopo/provider": patch
"@prosopo/procaptcha-pow": patch
---

A routing machine that sends a user from PoW to icon-order now actually serves them icon-order. Before, the provider dropped that escalation and let the PoW solve pass on its own, and the PoW widget ignored an icon-order escalation if one arrived. A site without the icon-order flag gets puzzle (or image) instead, as with any other disabled type.

The missing-click and changed-IP checks also no longer replace a routed icon-order challenge with an image one.

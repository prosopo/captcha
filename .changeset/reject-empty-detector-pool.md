---
"@prosopo/types": patch
"@prosopo/provider": patch
---

Reject a detector pool push that contains no bundles.

The admin endpoint that replaces a provider's detector pool accepted `{"bundles": {}}`. It then emptied the pool in memory, deleted every bundle file on disk, and answered with success. The node was left with no detector bundles, which also survived a restart, until someone pushed a good pool. The request schema now requires at least one bundle, so an empty push is refused with a validation error and the existing pool stays as it was.

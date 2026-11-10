---
"@prosopo/provider": patch
---

Registering a single site key through the admin API without `settings` now works and uses the same default settings as the bulk endpoint (`domains: ["localhost"]`). Before, it tried to build defaults without the required `domains` field, so every such request failed with a vague "Unknown API error" and the site key was not registered.

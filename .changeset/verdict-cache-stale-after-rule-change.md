---
"@prosopo/provider": patch
---

Changing an access rule now reliably clears the provider's cached block verdicts. A verdict lookup that was already running when the rules changed used to finish afterwards and write the old answer back into the cache, so a just-deleted block rule could keep blocking (or a just-added one keep allowing) for up to ten more seconds. Lookups that started before the change no longer write their result, and new requests no longer wait on them.

---
"@prosopo/procaptcha-pow": patch
"@prosopo/procaptcha-puzzle": patch
---

fix(procaptcha-pow): forward all props through the Suspense wrapper so `onEscalate` and `autoStart` reach the inner widget. The PoW (and puzzle) wrappers were enumerating props by name and silently dropping `onEscalate`, which meant the Manager closure captured `onEscalate=undefined`. When the provider returned a post-PoW escalation envelope, `onEscalate?.()` no-op'd, the frictionless wrapper was never told to swap in the image widget, and the user was left with a spinning PoW checkbox forever. Both wrappers now spread props, matching the image (`Procaptcha`) sibling.

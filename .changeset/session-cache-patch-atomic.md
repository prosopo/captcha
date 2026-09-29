---
"@prosopo/database": patch
---

Patching a cached session in Redis no longer brings back a session that was invalidated between the read and the write, and no longer drops a field written by a concurrent patch. The write now only lands if the cached value is unchanged since it was read (checked inside Redis); on a conflict the patch is recomputed, and if the session has gone the patch does nothing.
